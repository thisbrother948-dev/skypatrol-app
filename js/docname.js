import { buildFileName } from './naming.js'

// period = 문서에 기입된 날짜의 연월. 실제로 언제 갔는지가 아니라 서류에 뭐라 적혀 있는지가 기준이다
// (한 번 방문해 여러 날짜로 나눠 적는 실무가 있고, 감사·총괄이 보는 것도 서류에 적힌 날짜뿐이다).
export function periodOf(def, v) {
  const d = v?.[def.naming?.dateKey]
  return (d && String(d).slice(0, 7)) || new Date().toISOString().slice(0, 7)
}

// def.naming.by: 'agency' (순회/합동) | 'branch' (회의록). 순수 — 날짜는 values에서 온다.
// docId는 한 번 정해지면 안 바뀐다(멱등). 파일명은 매번 현재 값으로 다시 만든다.
export function buildDocMeta(def, v, existingDocId) {
  const period = periodOf(def, v)
  const byBranch = def.naming?.by === 'branch'
  if (byBranch) {
    return {
      byBranch: true,
      docId: existingDocId || `${def.id}-${period}-${v.round}`,
      fileName: buildFileName(def.naming.label, null, period, v.round),
      agency: null,
      period,
    }
  }
  return {
    byBranch: false,
    docId: existingDocId || `${def.id}-${period}-${v.agency}-${v.round}`,
    fileName: buildFileName(def.naming.label, v.agency, period, v.round),
    agency: v.agency ?? null,
    period,
  }
}
