import { GRID, DEFAULT_ROW } from './grid-dims.js'

export const CHAR_PT = 5.0  // 문자폭 1 ≈ 5pt (근사, CALIB로 보정)

// 초기 identity. Task 7 캘리브레이션에서 양식별로 튜닝.
// Task7 캘리브레이션: raw 격자(A1~J끝)를 템플릿 PDF의 실제 표 외곽 경계에 정확히 매핑.
// 값은 pdfplumber로 각 템플릿의 격자선 bbox를 추출해 계산(scripts/calc-calib.py). 육안 아님.
//   ox=border.left, oy=border.top, sx=border.width/rawW, sy=border.height/rawH
export const CALIB = {
  sunhoe:   { ox: 18.12, oy: 54.12, sx: 1.2136, sy: 0.7489 },
  hapdong:  { ox: 18.12, oy: 54.12, sx: 1.2136, sy: 0.7454 },
  hoeuirok: { ox: 17.04, oy: 28.44, sx: 1.2136, sy: 0.7477 },
}

export function parseRef(ref) {
  const cell = /^([A-J])(\d+)$/
  const [a, b] = ref.split(':')
  const m1 = a.match(cell); const m2 = (b || a).match(cell)
  if (!m1 || !m2) throw new Error(`bad ref: ${ref}`)
  const col = ch => ch.charCodeAt(0) - 65
  return { c1: col(m1[1]), r1: +m1[2], c2: col(m2[1]), r2: +m2[2] }
}

function colX(cols, i) {  // i번째 열 좌경계(pt)
  let x = 0
  for (let k = 0; k < i; k++) x += cols[k] * CHAR_PT
  return x
}
function rowY(rows, r) {  // r행 상경계(pt)
  let y = 0
  for (let k = 1; k < r; k++) y += rows[k] ?? DEFAULT_ROW
  return y
}

export function rawRect(formId, ref) {
  const g = GRID[formId]
  const { c1, r1, c2, r2 } = parseRef(ref)
  const x = colX(g.cols, c1)
  const xEnd = colX(g.cols, c2) + g.cols[c2] * CHAR_PT
  const y = rowY(g.rows, r1)
  let yEnd = rowY(g.rows, r2) + (g.rows[r2] ?? DEFAULT_ROW)
  return { x, y, w: xEnd - x, h: yEnd - y }
}

export function cellRect(formId, ref, pageHeight) {
  const { ox, oy, sx, sy } = CALIB[formId]
  const r = rawRect(formId, ref)
  const x = ox + r.x * sx
  const w = r.w * sx
  const top = oy + r.y * sy
  const h = r.h * sy
  return { x, y: pageHeight - (top + h), w, h }  // pdf-lib: 좌하단 원점
}
