// period = 'YYYY-MM' (문서에 기입된 날짜의 연월). 연도·월이 한 문자열에서 오므로 어긋날 수 없다.
// 파일명에 양식·연월을 넣는 이유: (1) 총괄이 기안서에 첨부하면 폴더 맥락이 사라져 파일명 혼자
// 서야 한다 (2) saveDoc_가 같은 이름 파일을 휴지통에 보내므로, 연도나 양식이 빠지면 남의 기록을 지운다.
export function buildFileName(label, agency, period, round) {
  return agency ? `${label}_${agency}_${period}_${round}차` : `${label}_${period}_${round}차`
}

export function nextRound(existing, period) {
  const rounds = existing.filter(d => d.period === period).map(d => d.round)
  return rounds.length ? Math.max(...rounds) + 1 : 1
}

export function isDuplicate(existing, period, round) {
  return existing.some(d => d.period === period && d.round === round)
}
