import { getConfig } from './config.js'
import { listAll } from './store.js'
import { queueOf } from './docstatus.js'
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

// 상태별 4섹션 홈. 로그인 없어 모두 동일 화면(각자 자기 섹션 처리). 일괄 버튼 없음.
export async function renderHome(root, deps = {}) {
  const cfg = (deps.getConfig || getConfig)()
  const forms = deps.forms || FORMS
  const shared = deps.shared ?? !!cfg.APPS_SCRIPT_URL
  const docs = await (deps.loadDocs || listAll)()

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
      ${badge(d)}
    </div>`

  const menu = (cfg.enabledForms || []).map(id => forms[id]).filter(Boolean).map(f => `
    <button class="menu-btn" data-open="${f.id}">
      <span class="menu-ico">📋</span>
      <span><h3>${f.menuTitle || f.title}</h3><p>${f.title}</p></span>
      <span class="arrow">›</span>
    </button>`).join('')

  const byQ = { draft: [], confirm: [], approve: [], done: [] }
  for (const d of docs) (byQ[queueOf(d)] || byQ.draft).push(d)
  const sections = SECTIONS.map(s => `
    <div class="section-label">${s.label} · ${byQ[s.key].length}건</div>
    <div class="doc-list">${byQ[s.key].map(row).join('') || '<div class="empty-hint">없음</div>'}</div>`).join('')

  root.innerHTML = `<div class="hello">${cfg.branch}</div>${menu}${sections}`
}
