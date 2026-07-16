import { roster as fetchRoster } from './sharedstore.js'

const KEY = 'skypatrol.roster'

// 지사 구글 시트에서 온 raw 로스터를 앱 내부 메타 구조로 정규화. staff는 담당 칸 고유값으로 도출.
export function normalizeRoster(raw) {
  const agencies = Array.isArray(raw?.agencies)
    ? raw.agencies.map(a => ({ name: a.name || '', lcode: a.lcode || '', contact: a.contact || '' }))
    : []
  const staff = []
  for (const a of agencies) {
    if (a.contact && !staff.includes(a.contact)) staff.push(a.contact)
  }
  return {
    branch: raw?.branch || '',
    manager: raw?.manager || '',
    safetyLead: raw?.safetyLead || '',
    agencies,
    staff,
  }
}

export function cacheRoster(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)) } catch { /* 저장 실패는 무시(캐시는 최적화) */ }
}

export function rosterFromCache() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null } catch { return null }
}

// url 있으면 원격 로스터를 읽어 정규화·캐시. 실패·오프라인이면 직전 캐시로 폴백.
export async function loadRoster({ url, fetchImpl } = {}) {
  if (!url) return null
  const r = await fetchRoster({ url, fetchImpl })
  if (r && r.ok && r.roster) {
    const norm = normalizeRoster(r.roster)
    cacheRoster(norm)
    return norm
  }
  return rosterFromCache()
}
