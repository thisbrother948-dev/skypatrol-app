const KEY = 'skypatrol.me'

// 저장은 이름·지사만. 역할은 로스터에서 매번 도출한다 — 앱에 박아두면 인사이동 순간부터 거짓말이 시작된다.
export function getMe() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null } catch { return null }
}

export function setMe(name, branch) {
  try { localStorage.setItem(KEY, JSON.stringify({ name, branch })) } catch { /* 저장 실패는 무시(다음 부팅에 다시 물음) */ }
}

// 다중 역할 허용 — 총괄이 대리점 담당을 겸할 수 있다. 우선순위를 매기면 그의 담당 문서가 홈에서 사라진다.
export function rolesOf(name, meta) {
  const out = []
  if (!name || !meta) return out
  if (meta.manager === name) out.push('manager')
  if (meta.safetyLead === name) out.push('safetyLead')
  if ((meta.staff || []).includes(name)) out.push('staff')
  return out
}

// 지사 일치 AND 이름이 로스터에 존재. 이름만 보면 8지사 동명이인이 남 행세를 한다.
export function isValidMe(me, meta) {
  if (!me || !me.name || !meta) return false
  if (me.branch !== meta.branch) return false
  return rolesOf(me.name, meta).length > 0
}

export function myAgencies(name, meta) {
  if (!name || !meta) return []
  return (meta.agencies || []).filter(a => a.contact === name).map(a => a.name)
}

// 신원 선택 후보. 담당 → 지사장 → 총괄 순, 겸직자는 한 번만.
export function rosterPeople(meta) {
  const out = []
  const add = n => { if (n && !out.includes(n)) out.push(n) }
  if (!meta) return out
  ;(meta.staff || []).forEach(add)
  add(meta.manager)
  add(meta.safetyLead)
  return out
}

// 신규 문서에만 박는다. author 없는 옛 문서에 지금 사람을 박으면 거짓이 된다(합집합 필터가 대리점 매핑으로 잡아준다).
export function authorFor(existingDoc, me) {
  if (existingDoc) return existingDoc.author
  return (me && me.name) || undefined
}

// 신원을 물으려면 진짜 명단이 있어야 한다. 공유모드에서 로스터를 못 받았거나 지사명이 빈 채로
// 오면 getMeta()가 branches.js placeholder로 폴백하는데, 그게 후보로 새면 실존하지 않는
// 사람이 author로 영구히 박힌다. getMeta()의 캐시 채택 조건(cached.branch truthy)과 정확히
// 같은 것을 보아야 어긋나지 않는다.
export function canAskIdentity({ apps, cachedRoster, meta } = {}) {
  if (apps && !(cachedRoster && cachedRoster.branch)) return false
  return rosterPeople(meta).length > 0
}
