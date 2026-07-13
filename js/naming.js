export function buildFileName(agency, month, round) {
  return `${agency}_${month}월_${round}차`
}

export function nextRound(existing, month) {
  const rounds = existing.filter(d => d.month === month).map(d => d.round)
  return rounds.length ? Math.max(...rounds) + 1 : 1
}

export function isDuplicate(existing, month, round) {
  return existing.some(d => d.month === month && d.round === round)
}
