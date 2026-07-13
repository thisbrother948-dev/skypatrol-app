import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { cellRect } from './cellmap.js'

const BLACK = rgb(0, 0, 0)
const PAD = 2
const BASE_SIZE = 9
const MIN_SIZE = 5
const LINE_MULT = 1.2

// NanumGothic-Regular.ttf 글리프 커버리지 확인 결과(2026-07-13):
// mark.js가 쓰는 ✕(U+2715), −(U+2212) 글리프가 폰트에 없음(tofu 방지 위해 대체).
// ×(U+00D7), -(U+002D)는 존재 확인됨. ○(U+25CB), △(U+25B3)는 폰트에 있어 대체 불필요.
const MARK_GLYPH_FALLBACK = { '✕': '×', '−': '-' }
function safeMark(m) {
  return MARK_GLYPH_FALLBACK[m] ?? m
}

export function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] || ''
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function mimeOf(dataUrl) {
  const m = /^data:([^;]+);/.exec(dataUrl)
  return m ? m[1] : ''
}

// 칸 폭에 맞춰 줄바꿈(문자 단위, 한글은 공백이 없을 수 있으므로).
function wrapLines(font, text, size, maxW) {
  const paragraphs = String(text).split('\n')
  const lines = []
  for (const para of paragraphs) {
    if (para === '') { lines.push(''); continue }
    const chars = Array.from(para)
    let cur = ''
    for (const ch of chars) {
      const test = cur + ch
      if (cur !== '' && font.widthOfTextAtSize(test, size) > maxW) {
        lines.push(cur)
        cur = ch
      } else {
        cur = test
      }
    }
    if (cur !== '') lines.push(cur)
  }
  return lines.length ? lines : ['']
}

// 폰트크기를 줄여가며(오토핏) 칸 안에 들어가는 줄바꿈 결과를 찾는다. 최소 크기에서도
// 넘치면 잘라내어(clip) 칸 밖으로 나가지 않도록 보장한다(하드 제약: 칸 밖 금지).
function fitAndWrap(font, text, maxW, maxH) {
  let size = BASE_SIZE
  let lines = wrapLines(font, text, size, maxW)
  while (size > MIN_SIZE && lines.length * size * LINE_MULT > maxH) {
    size -= 0.5
    lines = wrapLines(font, text, size, maxW)
  }
  const maxLines = Math.max(1, Math.floor(maxH / (size * LINE_MULT)))
  if (lines.length > maxLines) lines = lines.slice(0, maxLines)
  return { size, lines }
}

function drawTextInRect(page, font, text, rect, opts = {}) {
  const t = text == null ? '' : String(text).trim()
  if (t === '') return
  const pad = opts.pad ?? PAD
  const maxW = Math.max(1, rect.w - pad * 2)
  const maxH = Math.max(1, rect.h - pad * 2)
  const { size, lines } = fitAndWrap(font, t, maxW, maxH)
  const lineH = size * LINE_MULT
  const blockH = lines.length * lineH
  const maxTop = rect.y + rect.h - pad
  const minBottom = rect.y + pad
  let top = rect.y + rect.h / 2 + blockH / 2 // 세로 중앙 정렬 기준 상단
  if (top > maxTop) top = maxTop
  if (top - blockH < minBottom) top = Math.min(maxTop, minBottom + blockH)

  let baseline = top - size * 0.9
  for (const line of lines) {
    if (line !== '') {
      page.drawText(line, { x: rect.x + pad, y: baseline, size, font, color: BLACK })
    }
    baseline -= lineH
  }
}

async function embedImage(pdf, dataUrl) {
  const bytes = dataUrlToBytes(dataUrl)
  const mime = mimeOf(dataUrl)
  const isJpg = /image\/jpe?g/i.test(mime)
  try {
    return await (isJpg ? pdf.embedJpg(bytes) : pdf.embedPng(bytes))
  } catch {
    // Fallback: try the other decoder if the first fails (e.g., unexpected mime type like image/webp)
    return await (isJpg ? pdf.embedPng(bytes) : pdf.embedJpg(bytes))
  }
}

async function drawImageContain(pdf, page, dataUrl, rect, opts = {}) {
  if (!dataUrl) return
  const pad = opts.pad ?? PAD
  const img = await embedImage(pdf, dataUrl)
  const availW = Math.max(1, rect.w - pad * 2)
  const availH = Math.max(1, rect.h - pad * 2)
  const scale = Math.min(availW / img.width, availH / img.height, 1)
  const w = img.width * scale
  const h = img.height * scale
  page.drawImage(img, {
    x: rect.x + (rect.w - w) / 2,
    y: rect.y + (rect.h - h) / 2,
    width: w,
    height: h,
  })
}

function splitRectH(rect, leftFrac) {
  const leftW = rect.w * leftFrac
  return [
    { x: rect.x, y: rect.y, w: leftW, h: rect.h },
    { x: rect.x + leftW, y: rect.y, w: rect.w - leftW, h: rect.h },
  ]
}

async function drawAttendeeSign(pdf, page, font, f, value, values, rect) {
  const a = value || {}
  let soso
  if (f.affiliationInput) {
    soso = a.soso || ''
  } else {
    soso = f.affiliation || (f.sosoFrom ? (values[f.sosoFrom] || '') : '')
  }
  if (f.sosoCell && soso) drawTextInRect(page, font, soso, rect(f.sosoCell))
  if (f.posCell && a.title) drawTextInRect(page, font, a.title, rect(f.posCell))
  if (f.signCell) {
    const signRect = rect(f.signCell)
    const [nameRect, imgRect] = splitRectH(signRect, a.sign ? 0.42 : 1)
    if (a.name) drawTextInRect(page, font, a.name, nameRect)
    if (a.sign) await drawImageContain(pdf, page, a.sign, imgRect)
  }
}

export async function renderPdf({ templateBytes, fontBytes, formId, def, values }) {
  const pdf = await PDFDocument.load(templateBytes)
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(fontBytes, { subset: true })
  const page = pdf.getPage(0)
  const H = page.getHeight()
  const rect = ref => cellRect(formId, ref, H)

  for (const f of def.fields) {
    const v = values[f.key]
    switch (f.type) {
      case 'text':
      case 'textarea':
      case 'date':
      case 'agency-select': {
        if (f.cell) drawTextInRect(page, font, v, rect(f.cell))
        break
      }
      case 'choice': {
        // 원본 템플릿에 "□ 설치 □ A/S …" 옵션이 이미 인쇄돼 있음.
        // optionMarks가 있으면 선택 옵션의 □ 위에 채운 사각형으로 체크(정밀).
        // 없으면 칸 시작부에 [값] 텍스트 대체(겹칠 수 있음).
        if (v != null && v !== '') {
          const mk = f.optionMarks && f.optionMarks[v]
          if (mk) {
            page.drawRectangle({ x: mk[0] + 1.4, y: mk[1] + 2, width: 6, height: 6, color: BLACK })
          } else if (f.cell) {
            drawTextInRect(page, font, `[${v}]`, rect(f.cell))
          }
        }
        break
      }
      case 'checklist': {
        const items = Array.isArray(v) ? v : []
        const byNo = new Map(items.map(i => [i.no, i]))
        for (const row of f.rows) {
          const item = byNo.get(row.no)
          if (!item) continue
          if (row.labelCell && item.label) drawTextInRect(page, font, item.label, rect(row.labelCell))
          if (row.markCell && item.mark) drawTextInRect(page, font, safeMark(item.mark), rect(row.markCell))
          if (row.actionCell && item.action) drawTextInRect(page, font, item.action, rect(row.actionCell))
        }
        break
      }
      case 'text-list': {
        const items = Array.isArray(v) ? v : []
        const byNo = new Map(items.map(i => [i.no, i]))
        for (const row of f.rows) {
          const item = byNo.get(row.no)
          if (item && item.text) drawTextInRect(page, font, item.text, rect(row.cell))
        }
        break
      }
      case 'attendee-sign': {
        await drawAttendeeSign(pdf, page, font, f, v, values, rect)
        break
      }
      case 'signature': {
        if (f.cell && v) await drawImageContain(pdf, page, v, rect(f.cell))
        break
      }
      case 'photos': {
        const arr = Array.isArray(v) ? v : []
        const n = Math.min(arr.length, f.cells.length)
        for (let i = 0; i < n; i++) {
          if (arr[i]) await drawImageContain(pdf, page, arr[i], rect(f.cells[i]))
        }
        break
      }
      default:
        // month/round 등 셀 좌표가 없는 필드는 렌더링 대상 아님(문서 파일명 등에 사용).
        break
    }
  }

  return pdf.save()
}
