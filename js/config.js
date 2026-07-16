import { BRANCHES } from '../config/branches.js'
import { rosterFromCache } from './roster.js'

const KEY = 'skypatrol.config'

// 지사/대리점은 설정 데이터. 코드 로직은 이 값에 의존하지 않고 주입만 받는다.
export const DEFAULT_CONFIG = {
  branch: '대구경북지사',
  agencies: ['행복대리점', '미래대리점', '한빛대리점'],
  enabledForms: ['sunhoe', 'hapdong', 'hoeuirok'],
  APPS_SCRIPT_URL: '',   // 비면 목(로컬), URL이면 실제 드라이브 저장
}

export function getConfig() {
  let saved = {}
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { saved = {} }
  const cfg = { ...DEFAULT_CONFIG, ...saved }
  if (cfg.branch === '대구·경북지사') cfg.branch = '대구경북지사'  // 옛 표기(가운뎃점) 정규화
  return cfg
}

export function setConfig(partial) {
  const next = { ...getConfig(), ...partial }
  localStorage.setItem(KEY, JSON.stringify(next))
}

export function getMeta() {
  const c = getConfig()
  const cached = rosterFromCache()
  if (c.APPS_SCRIPT_URL && cached && cached.branch) {
    return {
      branch: cached.branch,
      agencies: cached.agencies || [],
      manager: cached.manager || '',
      safetyLead: cached.safetyLead || '',
      staff: cached.staff || [],
    }
  }
  const m = BRANCHES[c.branch]
  if (!m) return { branch: c.branch, agencies: (c.agencies || []).map(n => ({ name: n })), manager: '', safetyLead: '', staff: [] }
  return { branch: c.branch, agencies: m.agencies || [], manager: m.manager || '', safetyLead: m.safetyLead || '', staff: m.staff || [] }
}

export function agencyNames() {
  return (getMeta().agencies || []).map(a => a.name)
}

export function agencyContact(name) {
  const a = (getMeta().agencies || []).find(x => x.name === name)
  return a ? a.contact : undefined
}

export function resolveAgencyDefaults(def, agencyName) {
  const out = {}
  for (const f of def.fields) {
    if (f.defaultFrom === 'agencyContact') out[f.key] = agencyContact(agencyName) || ''
  }
  return out
}
