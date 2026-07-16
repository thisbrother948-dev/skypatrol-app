// 담당 폰 로컬 문서 잔류 방지: 마지막 활동 maxAgeDays 초과분의 docId 목록.
// 미전송(pending/conflict)은 손실 방지 위해 제외. 타임스탬프 없으면 보존.
export function expiredDocIds(docs, nowMs, maxAgeDays = 90) {
  const limit = maxAgeDays * 86400000
  const out = []
  for (const d of docs || []) {
    if (d.sync === 'pending' || d.sync === 'conflict') continue
    const ts = [Date.parse(d.savedAt || ''), Date.parse(d.updatedAt || '')].filter(Number.isFinite)
    if (!ts.length) continue
    const last = Math.max(...ts)
    if (nowMs - last > limit) out.push(d.docId)
  }
  return out
}
