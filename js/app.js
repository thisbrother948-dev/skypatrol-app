import { getConfig, getMeta } from './config.js'
import { listAll } from './store.js'
import { queueOf } from './docstatus.js'
import { getMe, rolesOf, myAgencies } from './identity.js'
import { FORMS } from '../forms/index.js'

const SECTIONS = [
  { key: 'draft', label: '작성 중' },
  { key: 'confirm', label: '확인자(지사장) 서명 대기' },
  { key: 'approve', label: '승인·완료 대기' },
  { key: 'done', label: '완료됨' },
]
const SYNC_BADGE = {
  local: '⏳ 로컬만', pending: '⏳ 업로드 대기', synced: '✓ 동기화됨', conflict: '⚠️ 충돌',
}

// 담당 기본값은 '내 문서' — '작성 중'에 담당 3~7명 것이 뒤섞이는 게 원래 불편의 정체였다.
let homeFilter = 'mine'
export function getHomeFilter() { return homeFilter }
export function setHomeFilter(v) { homeFilter = (v === 'all' ? 'all' : 'mine') }

// 상태별 4섹션 홈. 로그인 없어 인증은 없고, 신원은 자기신고(identity.js) — 귀속·필터용.
export async function renderHome(root, deps = {}) {
  const cfg = (deps.getConfig || getConfig)()
  const forms = deps.forms || FORMS
  const shared = deps.shared ?? !!cfg.APPS_SCRIPT_URL
  const docs = await (deps.loadDocs || listAll)()
  const meta = (deps.getMeta || getMeta)()
  const me = (deps.getMe || getMe)()
  const filter = deps.filter || homeFilter

  // 필터는 담당에게만. 지사장·총괄의 큐는 이미 상태 섹션이 갈라주므로 필터를 주면 오히려 전체를 놓친다.
  // 판정은 직함이 아니라 staff 포함 여부 — 총괄이 담당을 겸하면 그에게도 담당으로서의 불편이 실재한다.
  const isStaff = rolesOf(me?.name, meta).includes('staff')
  const mine = new Set(myAgencies(me?.name, meta))
  const isMine = d => (d.agency && mine.has(d.agency)) || (d.author && d.author === me?.name)
  const shown = (isStaff && filter === 'mine') ? docs.filter(isMine) : docs

  const titleOf = id => (forms[id]?.menuTitle || forms[id]?.title || id)
  // fileName = "행복대리점_7월_1차" → 라벨. (원격 문서는 values 없이 메타만 있을 수 있어 fileName 사용)
  const labelOf = d => {
    const tail = (d.fileName || '').split('_').slice(1).join(' ')
    return `${d.agency ? d.agency + ' · ' : ''}${tail ? tail + ' · ' : ''}${titleOf(d.formId)}`
  }
  const badge = d => (shared && d.sync) ? `<span class="sync-badge s-${d.sync}">${SYNC_BADGE[d.sync] || ''}</span>` : ''
  const row = d => `
    <div class="draft" data-id="${d.docId}" data-status="${d.status || 'draft'}">
      <span class="open-doc"><span class="dmain">${labelOf(d)}</span></span>
      ${d.author ? `<span class="author-badge">${d.author}</span>` : ''}
      ${badge(d)}
    </div>`

  const menu = (cfg.enabledForms || []).map(id => forms[id]).filter(Boolean).map(f => `
    <button class="menu-btn" data-open="${f.id}">
      <span class="menu-ico">📋</span>
      <span><h3>${f.menuTitle || f.title}</h3><p>${f.title}</p></span>
      <span class="arrow">›</span>
    </button>`).join('')

  const byQ = { draft: [], confirm: [], approve: [], done: [] }
  for (const d of shown) (byQ[queueOf(d)] || byQ.draft).push(d)
  const sections = SECTIONS.map(s => `
    <div class="section-label">${s.label} · ${byQ[s.key].length}건</div>
    <div class="doc-list">${byQ[s.key].map(row).join('') || '<div class="empty-hint">없음</div>'}</div>`).join('')

  const whoami = me ? `<button class="whoami" data-change-me>${me.name} ▾</button>` : ''
  const toggle = isStaff ? `
    <div class="home-filter">
      <button class="hf-btn${filter === 'mine' ? ' on' : ''}" data-filter="mine">내 문서</button>
      <button class="hf-btn${filter === 'all' ? ' on' : ''}" data-filter="all">전체</button>
    </div>` : ''

  root.innerHTML = `<div class="hello">${cfg.branch}${whoami}</div>${menu}${toggle}${sections}`
}
