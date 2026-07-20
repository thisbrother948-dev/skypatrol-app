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
  hoeuirok_large:    { ox: 40, oy: 40, sx: 1, sy: 1 },                 // 페이지1 = 직접 그린 격자(identity)
  hoeuirok_large_p2: { ox: 40, oy: 60, sx: 1, sy: 1 },                 // 페이지2 = 직접 그린 격자(identity)
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

// X 보정(2026-07-15): 행(y) 매핑은 정확하나, 근사 열폭(grid-dims)+단일 아핀(CALIB.sx)이
// 실제 열경계와 비선형으로 어긋나(누적 드리프트, 최대 ~34pt) 긴 값이 옆칸을 침범했다.
// 각 knot=[계산x, 실측x] 사이를 구간선형 보간해 x를 실제 열경계에 스냅한다.
// 값은 pdfplumber로 각 템플릿 격자선 실측(seal 블록 제외). y는 그대로 둔다.
const X_KNOTS = {
  sunhoe:   [[18.1, 18], [106.7, 85], [157.9, 151], [315.8, 297], [367, 364], [436.3, 443], [576.1, 576]],
  hapdong:  [[18.1, 18], [106.7, 85], [157.9, 151], [176.1, 165], [315.8, 297], [367, 364], [436.3, 443], [576.1, 576]],
  hoeuirok: [[17, 17], [105.6, 84], [175, 164], [263.6, 230], [314.7, 296], [365.9, 363], [417, 428], [435.2, 442], [575, 575]],
}
// 결재(seal) 블록은 본문과 별개의 하위 열그리드라 메인 remap이 안 맞는다. 서명칸의
// X는 seal 하위칸 실측값으로 직접 지정(x, w). y는 계산값(행 매핑 정확) 유지.
const SEAL_X = {
  sunhoe:   { 'I2:I3': [443.2, 66.2], 'J2:J3': [509.4, 66.3] },
  hapdong:  { 'I2:I3': [443.2, 66.2], 'J2:J3': [509.4, 66.3] },
  hoeuirok: { 'I2:I3': [442.1, 66.2], 'J2:J3': [508.3, 66.3] },
  hoeuirok_large: { 'I1:I1': [435, 60], 'J1:J1': [495, 60] },
}

function remapX(formId, x) {
  const k = X_KNOTS[formId]
  if (!k) return x
  if (x <= k[0][0]) return k[0][1] + (x - k[0][0])            // 첫 knot 이전: 오프셋 유지
  for (let i = 0; i < k.length - 1; i++) {
    const [c0, a0] = k[i], [c1, a1] = k[i + 1]
    if (x <= c1) return a0 + (a1 - a0) * (x - c0) / (c1 - c0) // 구간 선형보간
  }
  const last = k[k.length - 1]
  return last[1] + (x - last[0])                             // 마지막 knot 이후
}

export function cellRect(formId, ref, pageHeight) {
  const { ox, oy, sx, sy } = CALIB[formId]
  const r = rawRect(formId, ref)
  let x = ox + r.x * sx
  let xEnd = x + r.w * sx
  const seal = SEAL_X[formId] && SEAL_X[formId][ref]
  if (seal) {
    x = seal[0]; xEnd = seal[0] + seal[1]                     // seal 명시좌표(X만)
  } else {
    x = remapX(formId, x); xEnd = remapX(formId, xEnd)        // 본문 x remap
  }
  const top = oy + r.y * sy
  const h = r.h * sy
  return { x, y: pageHeight - (top + h), w: xEnd - x, h }     // pdf-lib: 좌하단 원점
}
