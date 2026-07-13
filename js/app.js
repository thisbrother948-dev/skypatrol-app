import { getConfig } from './config.js'
import { listOpen, listByStatus } from './store.js'
import { FORMS } from '../forms/index.js'

export async function renderHome(root, deps = {}) {
  const cfg = (deps.getConfig || getConfig)()
  const forms = deps.forms || FORMS
  const open = await (deps.listOpen || listOpen)()
  const done = await (deps.listDone || (() => listByStatus('done')))()
  const needSign = open.filter(d => !d.values.sigConfirmer)
  const titleOf = id => (forms[id]?.menuTitle || forms[id]?.title || id)
  const row = (d, attr) => `
    <div class="draft" ${attr} data-id="${d.docId}">
      <input type="checkbox" class="pick">
      <span class="open-doc"><span class="dmain">${d.agency ? d.agency + ' · ' : ''}${d.values.month}월 ${d.values.round}차</span>
      <span class="dsub">${titleOf(d.formId)}</span></span>
    </div>`
  const menu = (cfg.enabledForms || []).map(id => forms[id]).filter(Boolean).map(f => `
    <button class="menu-btn" data-open="${f.id}">
      <span class="menu-ico">📋</span>
      <span><h3>${f.menuTitle || f.title}</h3><p>${f.title}</p></span>
      <span class="arrow">›</span>
    </button>`).join('')
  root.innerHTML = `
    <div class="hello">${cfg.branch}</div>
    ${menu}
    <div class="section-label">지사장 서명 대기 · ${needSign.length}건</div>
    <div id="signList">${needSign.map(d => row(d, 'data-sign')).join('')}</div>
    ${needSign.length ? `<button class="add-sign" id="batchSign">서명하고 일괄 서명</button>` : ''}
    <div class="section-label">완료 대기 · ${open.length}건</div>
    <div id="completeList">${open.map(d => row(d, 'data-complete')).join('')}</div>
    ${open.length ? `<button class="add-sign" id="batchComplete">완료(PDF 생성)</button>` : ''}
    <div class="section-label">완료됨 · ${done.length}건</div>
    <div id="doneList">${done.map(d => row(d, 'data-done')).join('')}</div>
  `
}
