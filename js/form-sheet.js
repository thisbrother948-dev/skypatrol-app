// form-sheet.js — 양식형(서류 모양 그대로) 입력 렌더러.
// 계약은 form-renderer의 renderForm과 동일: (def, values, opts) → { el, collect }
// 값 형태도 동일(store/completion/PDF 무변경): items=배열{no,group,label,mark,action},
// attendee-sign={title,name,sign,soso?}, text-list=배열{no,text}, photos=[dataURL], signature=dataURL.
import { createSignaturePad } from './components/signature.js'
import { createPhotoGrid } from './components/photo.js'
import { agencyNames, getConfig, getMeta } from './config.js'

const JUDGE = [
  { m: '○', cls: 'r-ok', l: '적합' },
  { m: '△', cls: 'r-warn', l: '미흡' },
  { m: '✕', cls: 'r-bad', l: '부적합' },
  { m: '−', cls: 'r-na', l: '해당없음' },
]

function ensureStyles() {
  if (document.getElementById('sheet-styles')) return
  const s = document.createElement('style')
  s.id = 'sheet-styles'
  s.textContent = SHEET_CSS
  document.head.appendChild(s)
}

// ---- 공용 팝업/모달 (문서당 1개) ----
let judgePop, signModal, signPad, signCtx = {}
function ensureOverlays() {
  if (judgePop) return
  judgePop = document.createElement('div')
  judgePop.className = 'sheet-pop'
  judgePop.innerHTML = `<div class="sheet-pop-card"><h4>점검 결과 선택</h4><div class="judge4">${
    JUDGE.map(j => `<button class="j-${j.cls.slice(2)}" data-m="${j.m}" data-cls="${j.cls}">${j.m}<span class="l">${j.l}</span></button>`).join('')
  }</div></div>`
  judgePop.addEventListener('click', e => { if (e.target === judgePop) judgePop.classList.remove('on') })
  judgePop.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    if (judgePop._target) {
      const cell = judgePop._target
      cell.textContent = b.dataset.m
      cell.className = 'res ' + b.dataset.cls
      cell.dataset.mark = b.dataset.m
    }
    judgePop.classList.remove('on')
  }))
  document.body.appendChild(judgePop)

  signModal = document.createElement('div')
  signModal.className = 'sheet-modal'
  signModal.innerHTML = `<div class="sheet-modal-card">
    <h3 class="sm-title">서명</h3>
    <label>이름</label><input type="text" class="sm-name" placeholder="이름 입력">
    <div class="sm-padwrap"></div>
    <div class="sm-btns"><button class="sm-clear">지우기</button><button class="sm-ok">확인</button></div></div>`
  signModal.addEventListener('click', e => { if (e.target === signModal) signModal.classList.remove('on') })
  const padHost = signModal.querySelector('.sm-padwrap')
  signPad = createSignaturePad()
  padHost.appendChild(signPad.el)
  signModal.querySelector('.sm-clear').addEventListener('click', () => signPad.clear && signPad.clear())
  signModal.querySelector('.sm-ok').addEventListener('click', () => {
    const name = signModal.querySelector('.sm-name').value.trim()
    const png = signPad.getPNG ? signPad.getPNG() : null
    if (signCtx.onConfirm) signCtx.onConfirm({ name, png })
    signModal.classList.remove('on')
  })
  document.body.appendChild(signModal)
}
function openJudge(cell) { ensureOverlays(); judgePop._target = cell; judgePop.classList.add('on') }
function openSign(title, cur, onConfirm) {
  ensureOverlays()
  signModal.querySelector('.sm-title').textContent = title
  signModal.querySelector('.sm-name').value = cur?.name || ''
  if (signPad.clear) signPad.clear()
  signCtx = { onConfirm }
  signModal.classList.add('on')
}

// ---- 셀 헬퍼 ----
function editCell(val, ph, cls = '') {
  const td = document.createElement('td')
  td.className = 'val ' + cls
  td.contentEditable = 'true'
  td.dataset.ph = ph || ''
  if (val) td.textContent = val
  return td
}
function judgeCell(mark) {
  const td = document.createElement('td')
  const j = JUDGE.find(x => x.m === mark)
  td.className = 'res ' + (j ? j.cls : 'ph')
  td.textContent = j ? j.m : '선택'
  if (j) td.dataset.mark = j.m
  td.addEventListener('click', () => openJudge(td))
  return td
}
// 서명 셀. holder={name,png}를 제자리에서 갱신 → 호출측 getter가 holder를 읽음.
// showName=false면 이름줄 표시 안 함(문서 결재란처럼 서명만).
function signCell(role, holder, showName = true) {
  const td = document.createElement('td')
  td.className = 'signcell'
  const render = () => {
    td.innerHTML = ''
    if (holder.png) { const im = new Image(); im.src = holder.png; td.appendChild(im) }
    if (showName && holder.name) { const d = document.createElement('div'); d.className = 'signname'; d.textContent = holder.name; td.appendChild(d) }
    if (!holder.png && !(showName && holder.name)) { td.textContent = '(서명)'; td.classList.add('ph') }
    else td.classList.remove('ph')
  }
  render()
  td.addEventListener('click', () => openSign(role + ' 서명', holder, ({ name, png }) => {
    holder.name = name; if (png) holder.png = png; render()
  }))
  return td
}

// ---- 결재 박스(제목 옆). rowspan 없이 2행 3열로 안전하게. 서명칸엔 이름+서명 표시. ----
function gyeoljaeBox(labA, labB, holderA, holderB, roleA, roleB) {
  const gj = document.createElement('div'); gj.className = 'gyeoljae'
  const t = document.createElement('table'); gj.appendChild(t)
  const r1 = t.insertRow()
  r1.innerHTML = `<td class="gj">결재</td><td class="lab">${labA}</td><td class="lab">${labB}</td>`
  const r2 = t.insertRow()
  const blank = document.createElement('td'); blank.className = 'gj-b'
  r2.appendChild(blank)
  r2.appendChild(signCell(roleA, holderA, true))
  r2.appendChild(signCell(roleB, holderB, true))
  return gj
}

// ---- 메타 바(월/차수) + agency는 시트 내 select ----
function metaBar(def, values, getters) {
  const bar = document.createElement('div')
  bar.className = 'sheet-meta'
  const mm = values.month ?? (new Date().getMonth() + 1)
  const rd = values.round ?? 1
  bar.innerHTML = `<span class="mlabel">제출 정보</span>
    <span data-key="month">월 <input type="number" min="1" max="12" value="${mm}"></span>
    <span data-key="round">차수 <input type="number" min="1" value="${rd}"></span>`
  getters.month = () => Number(bar.querySelector('[data-key="month"] input').value)
  getters.round = () => Number(bar.querySelector('[data-key="round"] input').value)
  return bar
}
function agencySelectCell(values, getters) {
  const td = document.createElement('td')
  td.className = 'val'
  td.setAttribute('data-key', 'agency')
  const names = agencyNames().length ? agencyNames() : getConfig().agencies
  const sel = document.createElement('select')
  sel.innerHTML = '<option value="">선택</option>' +
    names.map(a => `<option${values.agency === a ? ' selected' : ''}>${a}</option>`).join('')
  td.appendChild(sel)
  getters.agency = () => sel.value
  return td
}

// ---- 판정/텍스트/체크 등 각 폼 빌더는 아래 SHEETS[def.id] ----
export function renderForm(def, values = {}, opts = {}) {
  ensureStyles()
  const stage = opts.stage || 'input'
  const el = document.createElement('div')
  el.className = 'sheet-wrap'
  const getters = {}
  const builder = SHEETS[def.id]
  if (!builder) { el.textContent = '양식형 미지원: ' + def.id; return { el, collect: () => ({}) } }
  builder(def, values, getters, el, stage)
  return { el, collect: () => { const o = {}; for (const k in getters) o[k] = getters[k](); return o } }
}

// ============ 폼별 빌더 ============
const SHEETS = {}

// ---- 순회점검 ----
SHEETS.sunhoe = (def, v, g, root) => {
  root.appendChild(metaBar(def, v, g))
  const sheet = document.createElement('div'); sheet.className = 'sheet'; root.appendChild(sheet)

  // 제목 + 결재
  const title = document.createElement('div'); title.className = 'titlebar'
  const insp = { png: v.sigInspector || null }
  const conf = { png: v.sigConfirmer || null }
  title.innerHTML = `<div class="t">${def.title}</div>`
  title.appendChild(gyeoljaeBox('점검자', '확인자', insp, conf, '점검자', '확인자(지사장)'))
  sheet.appendChild(title)
  g.sigInspector = () => insp.png || null
  g.sigConfirmer = () => conf.png || null

  // 기본정보
  const info = document.createElement('table'); sheet.appendChild(info)
  const r1 = info.insertRow()
  r1.innerHTML = `<td class="lb">점검일</td>`
  const dateTd = editCell(v.inspectDate || new Date().toISOString().slice(0, 10), 'YYYY-MM-DD'); r1.appendChild(dateTd)
  g.inspectDate = () => dateTd.textContent.trim()
  r1.insertAdjacentHTML('beforeend', `<td class="lb">점검자</td>`)
  const inspNameTd = editCell(v.inspector || '', '이름'); r1.appendChild(inspNameTd)
  g.inspector = () => inspNameTd.textContent.trim()

  const r2 = info.insertRow()
  r2.innerHTML = `<td class="lb">수급인<br>(대리점)</td>`
  r2.appendChild(agencySelectCell(v, g))
  r2.insertAdjacentHTML('beforeend', `<td class="lb">점검장소</td>`)
  const placeTd = editCell(v.place || '', '현장/장소'); r2.appendChild(placeTd)
  g.place = () => placeTd.textContent.trim()

  const r3 = info.insertRow()
  r3.innerHTML = `<td class="lb">작업내용</td>`
  const wcTd = editCell(v.workContent || '', '작업 내용'); r3.appendChild(wcTd)
  g.workContent = () => wcTd.textContent.trim()
  r3.insertAdjacentHTML('beforeend', `<td class="lb">작업유형</td>`)
  const wtTd = document.createElement('td'); wtTd.className = 'chkcell'; r3.appendChild(wtTd)
  buildChoice(wtTd, ['설치', 'A/S', '기타'], v.workType, val => g.workType = () => val())

  const r4 = info.insertRow()
  r4.innerHTML = `<td class="lb">점검목적</td>`
  const purTd = editCell(v.purpose || '', '도급사업 안전관리 점검 및 작업 현장 안전수칙 준수 여부 확인'); purTd.colSpan = 3; r4.appendChild(purTd)
  g.purpose = () => purTd.textContent.trim()

  // 점검 사항
  const itemsField = def.fields.find(f => f.key === 'items')
  buildChecklist(sheet, '도급사업 안전·보건 점검 사항', itemsField.rows, v.items, g)

  // 종합의견
  buildBigCell(sheet, '종합 의견 및 개선사항', 'summary', v.summary, '현장 확인 결과 미흡 사항 및 개선 요청 내용, 전반적인 작업 안전상태 기재', g)

  // 사진
  buildPhotos(sheet, '점검 사진', 'photos', 4, v.photos, g)
}

// ---- 공용: 단일선택 체크(작업유형/회의방식) ----
function buildChoice(host, options, cur, register) {
  let sel = cur || ''
  const render = () => {
    host.innerHTML = ''
    options.forEach(op => {
      const s = document.createElement('span'); s.className = 'chk' + (sel === op ? ' on' : '')
      s.innerHTML = (sel === op ? '☑ ' : '☐ ') + op
      s.addEventListener('click', () => { sel = (sel === op ? '' : op); render() })
      host.appendChild(s)
    })
  }
  render()
  register(() => sel)
}

// ---- 공용: 체크리스트 표 ----
function buildChecklist(sheet, secTitle, rows, curItems, g) {
  const bar = document.createElement('div'); bar.className = 'sheet-secbar'; bar.textContent = secTitle; sheet.appendChild(bar)
  const leg = document.createElement('div'); leg.className = 'sheet-legend'
  leg.textContent = '※ 범례(판정) : 적합(○), 미흡(△), 부적합(✕), 해당없음(−) · 점검결과 셀을 탭하여 선택'
  sheet.appendChild(leg)
  const tbl = document.createElement('table'); sheet.appendChild(tbl)
  tbl.innerHTML = '<colgroup><col style="width:8%"><col style="width:54%"><col style="width:13%"><col style="width:25%"></colgroup>'
  const h = tbl.insertRow(); h.className = 'clh'
  h.innerHTML = `<td>구분</td><td>점검 항목</td><td>점검<br>결과</td><td>조치 사항</td>`
  const byNo = new Map((curItems || []).map(i => [i.no, i]))
  const cellGetters = []
  // group rowspan
  const groups = []
  rows.forEach(r => { const gr = groups.find(x => x.g === r.group); if (gr) gr.rows.push(r); else groups.push({ g: r.group, rows: [r] }) })
  for (const grp of groups) {
    grp.rows.forEach((row, i) => {
      const tr = tbl.insertRow()
      if (i === 0) { const gtd = document.createElement('td'); gtd.className = 'gubun'; gtd.rowSpan = grp.rows.length; gtd.textContent = grp.g; tr.appendChild(gtd) }
      const cur = byNo.get(row.no) || {}
      // 항목(고정 or freeLabel 입력)
      let labelGetter
      if (row.freeLabel) {
        const q = editCell(cur.label || '', '기타 점검항목 입력', 'qcell'); tr.appendChild(q); labelGetter = () => q.textContent.trim()
      } else {
        const q = document.createElement('td'); q.className = 'qcell'; q.textContent = row.label; tr.appendChild(q); labelGetter = () => row.label
      }
      const jc = judgeCell(cur.mark); tr.appendChild(jc)
      const ac = editCell(cur.action || '', '', 'actcell'); tr.appendChild(ac)
      cellGetters.push(() => ({ no: row.no, group: row.group, label: labelGetter(), mark: jc.dataset.mark || null, action: ac.textContent.trim() }))
    })
  }
  g.items = () => cellGetters.map(fn => fn())
}

function buildBigCell(sheet, secTitle, key, val, ph, g) {
  const tbl = document.createElement('table'); sheet.appendChild(tbl)
  tbl.insertRow().innerHTML = `<td class="sec">${secTitle}</td>`
  const tr = tbl.insertRow()
  const td = editCell(val || '', ph, 'bigcell'); tr.appendChild(td)
  g[key] = () => td.textContent.trim()
}

function buildPhotos(sheet, secTitle, key, max, val, g) {
  const tbl = document.createElement('table'); sheet.appendChild(tbl)
  tbl.insertRow().innerHTML = `<td class="sec">${secTitle} <span class="secsub">(최대 ${max}장)</span></td>`
  const wrap = document.createElement('div'); wrap.className = 'photowrap'; sheet.appendChild(wrap)
  const grid = createPhotoGrid(max, () => {})
  ;(val || []).forEach(d => grid.add(d))
  wrap.appendChild(grid.el)
  g[key] = () => grid.get()
}

// ---- 공용: 참석자 셀 [소속, 직위, 성함(서명)] ----
function attendeeCells(f, v, g, opts = {}) {
  const cur = v[f.key] || {}
  const holder = { name: cur.name || (f.namePrefill ? (getMeta()[f.namePrefill] || '') : ''), png: cur.sign || null }
  const sosoTd = document.createElement('td'); sosoTd.className = 'val soso'
  if (f.affiliationInput) {
    sosoTd.contentEditable = 'true'; sosoTd.dataset.ph = '대리점명'
    if (cur.soso) sosoTd.textContent = cur.soso
  } else if (f.sosoFrom === 'agency' && opts.agencySelect) {
    sosoTd.setAttribute('data-key', 'agency'); sosoTd.appendChild(opts.agencySelect)
  } else if (f.sosoFrom === 'agency') {
    sosoTd.className = 'val soso agmirror'; sosoTd.textContent = '〃'
  } else {
    sosoTd.className = 'val soso fixed'; sosoTd.textContent = f.affiliation || ''
  }
  const titleTd = editCell(cur.title || '', '직위', 'att-pos')
  const signTd = signCell(f.label, holder, true)
  g[f.key] = () => {
    const out = { title: titleTd.textContent.trim(), name: holder.name, sign: holder.png }
    if (f.affiliationInput) out.soso = sosoTd.textContent.trim()
    return out
  }
  return [sosoTd, titleTd, signTd]
}

function attendeeHead(tbl, secTitle) {
  tbl.innerHTML = '<colgroup><col style="width:18%"><col style="width:11%"><col style="width:21%"><col style="width:18%"><col style="width:11%"><col style="width:21%"></colgroup>'
  if (secTitle) tbl.insertRow().innerHTML = `<td class="sec" colspan="6">${secTitle}</td>`
  tbl.insertRow().innerHTML = `<td class="sub" colspan="3">도급인</td><td class="sub" colspan="3">수급인</td>`
  tbl.insertRow().innerHTML = `<td class="clh2">소속</td><td class="clh2">직위</td><td class="clh2">성함(서명)</td><td class="clh2">소속</td><td class="clh2">직위</td><td class="clh2">성함(서명)</td>`
}

// ---- 합동점검 ----
SHEETS.hapdong = (def, v, g, root) => {
  root.appendChild(metaBar(def, v, g))
  const sheet = document.createElement('div'); sheet.className = 'sheet'; root.appendChild(sheet)
  const F = k => def.fields.find(f => f.key === k)

  // 제목 + 결재(담당=sigManager, 승인=sigConfirmer)
  const mgr = { png: v.sigManager || null }, conf = { png: v.sigConfirmer || null }
  const title = document.createElement('div'); title.className = 'titlebar'
  title.innerHTML = `<div class="t">${def.title}</div>`
  title.appendChild(gyeoljaeBox('담당', '승인', mgr, conf, '담당', '승인(지사장)'))
  sheet.appendChild(title)
  g.sigManager = () => mgr.png || null; g.sigConfirmer = () => conf.png || null

  // 기본정보
  const info = document.createElement('table'); sheet.appendChild(info)
  const r1 = info.insertRow(); r1.innerHTML = `<td class="lb">점검일</td>`
  const dt = editCell(v.inspectDate || new Date().toISOString().slice(0, 10), 'YYYY-MM-DD'); r1.appendChild(dt); g.inspectDate = () => dt.textContent.trim()
  r1.insertAdjacentHTML('beforeend', `<td class="lb">점검장소</td>`)
  const pl = editCell(v.place || '', '현장/장소'); r1.appendChild(pl); g.place = () => pl.textContent.trim()

  // 참석자
  const at = document.createElement('table'); sheet.appendChild(at)
  attendeeHead(at, '참석자 명단 (도급인 및 수급인 근로자 각 1명 이상 참여)')
  // 공용 대리점 select(수급인 소속 = agency)
  const names = agencyNames().length ? agencyNames() : getConfig().agencies
  const agSel = document.createElement('select')
  agSel.innerHTML = '<option value="">선택</option>' + names.map(a => `<option${v.agency === a ? ' selected' : ''}>${a}</option>`).join('')
  g.agency = () => agSel.value
  const row1 = at.insertRow()
  ;[...attendeeCells(F('att_jisajang'), v, g), ...attendeeCells(F('att_daerijeom1'), v, g, { agencySelect: agSel })].forEach(td => row1.appendChild(td))
  const row2 = at.insertRow()
  ;[...attendeeCells(F('att_jikwon'), v, g), ...attendeeCells(F('att_daerijeom2'), v, g)].forEach(td => row2.appendChild(td))

  // 점검항목
  buildChecklist(sheet, '점검 항목', F('items').rows, v.items, g)
  // 종합의견
  buildBigCell(sheet, '종합 의견 및 개선사항', 'summary', v.summary, '현장 확인 결과 미흡 사항 및 개선 요청 내용, 전반적인 작업 안전상태 기재', g)
  // 사진
  buildPhotos(sheet, '점검 사진', 'photos', 4, v.photos, g)
}

// ---- 협의체 회의록 ----
SHEETS.hoeuirok = (def, v, g, root) => {
  root.appendChild(metaBar(def, v, g))
  const sheet = document.createElement('div'); sheet.className = 'sheet'; root.appendChild(sheet)
  const F = k => def.fields.find(f => f.key === k)

  const mgr = { png: v.sigManager || null }, conf = { png: v.sigConfirmer || null }
  const title = document.createElement('div'); title.className = 'titlebar'
  title.innerHTML = `<div class="t">${def.title}</div>`
  title.appendChild(gyeoljaeBox('담당', '승인', mgr, conf, '담당', '승인(지사장)'))
  sheet.appendChild(title)
  g.sigManager = () => mgr.png || null; g.sigConfirmer = () => conf.png || null

  // 일시 / 회의방식
  const info = document.createElement('table'); sheet.appendChild(info)
  const r1 = info.insertRow(); r1.innerHTML = `<td class="lb">일시</td>`
  const dt = editCell(v.meetingDate || new Date().toISOString().slice(0, 10) + ' ', 'YYYY-MM-DD HH:MM'); r1.appendChild(dt); g.meetingDate = () => dt.textContent.trim()
  r1.insertAdjacentHTML('beforeend', `<td class="lb">회의방식</td>`)
  const mt = document.createElement('td'); mt.className = 'chkcell'; r1.appendChild(mt)
  buildChoice(mt, ['대면', '화상'], v.meetingType, reg => g.meetingType = reg)

  // 참석자(도급인 1 + 수급인 7)
  const at = document.createElement('table'); sheet.appendChild(at)
  attendeeHead(at, '참석자 명단')
  const suFields = def.fields.filter(f => /^att_su\d+$/.test(f.key))
  for (let i = 0; i < 7; i++) {
    const tr = at.insertRow()
    if (i === 0) { attendeeCells(F('att_dogupin'), v, g).forEach(td => tr.appendChild(td)) }
    else { tr.innerHTML = `<td class="val soso"></td><td class="val"></td><td class="signcell empty"></td>` }
    const su = suFields[i]
    if (su) attendeeCells(su, v, g).forEach(td => tr.appendChild(td))
    else tr.innerHTML += `<td class="val soso"></td><td class="val"></td><td class="signcell empty"></td>`
  }

  // 전 회차 협의사항 및 조치결과
  const pv = document.createElement('table'); sheet.appendChild(pv)
  pv.innerHTML = '<colgroup><col style="width:34%"><col><col style="width:27%"></colgroup>'
  pv.insertRow().innerHTML = `<td class="sec" colspan="3">전 회차 협의사항 및 조치결과</td>`
  pv.insertRow().innerHTML = `<td class="clh2" style="width:34%">협의항목</td><td class="clh2">조치결과</td><td class="clh2" style="width:26%">조치사진</td>`
  const pr = pv.insertRow()
  const pa = editCell(v.prevAgenda || '', '전 회차 협의항목', 'bigcell'); pa.style.minHeight = '60px'; pr.appendChild(pa); g.prevAgenda = () => pa.textContent.trim()
  const prz = editCell(v.prevResult || '', '조치결과', 'bigcell'); prz.style.minHeight = '60px'; pr.appendChild(prz); g.prevResult = () => prz.textContent.trim()
  const ppTd = document.createElement('td'); ppTd.className = 'photocell'; pr.appendChild(ppTd)
  const pgrid = createPhotoGrid(1, () => {}); (v.prevPhoto || []).forEach(d => pgrid.add(d)); ppTd.appendChild(pgrid.el); g.prevPhoto = () => pgrid.get()

  // 법적 협의사항 5개
  const ag = document.createElement('table'); sheet.appendChild(ag)
  ag.innerHTML = '<colgroup><col style="width:38%"><col></colgroup>'
  ag.insertRow().innerHTML = `<td class="sec" colspan="2">법적 협의사항 (산업안전보건법 시행규칙 제79조)</td>`
  ag.insertRow().innerHTML = `<td class="clh2" style="width:38%">협의항목</td><td class="clh2">협의사항</td>`
  const agField = F('agreements'); const byNo = new Map((v.agreements || []).map(i => [i.no, i]))
  const agGetters = []
  agField.rows.forEach(row => {
    const tr = ag.insertRow()
    tr.innerHTML = `<td class="qcell">${row.no}. ${row.label}</td>`
    const cur = byNo.get(row.no) || {}
    const td = editCell(cur.text || '', '협의 내용', 'bigcell'); td.style.minHeight = '56px'; tr.appendChild(td)
    agGetters.push(() => ({ no: row.no, text: td.textContent.trim() }))
  })
  g.agreements = () => agGetters.map(fn => fn())
}

const SHEET_CSS = `
.sheet-wrap{padding:8px 8px 12px;}
.sheet-meta{display:flex;gap:14px;align-items:center;width:100%;max-width:min(96vw,820px);margin:0 auto 8px;font-size:12px;color:#5b6470;background:#eef1f5;border-radius:8px;padding:7px 12px;}
.sheet-meta .mlabel{font-weight:700;color:#3a434d;}
.sheet-meta input{width:46px;border:1px solid #b9c1cc;border-radius:6px;padding:3px 5px;font-size:12px;margin-left:3px;}
.sheet{width:100%;max-width:min(96vw,820px);margin:0 auto;background:#fff;border:1.5px solid #2b3440;box-shadow:0 4px 18px rgba(20,40,60,.14);}
.sheet table{width:100%;border-collapse:collapse;table-layout:fixed;}
.sheet td,.sheet th{border:1px solid #8a94a0;padding:5px 6px;font-size:12px;line-height:1.4;vertical-align:middle;word-break:break-word;letter-spacing:-.3px;}
.titlebar{display:flex;border-bottom:1.5px solid #2b3440;}
.titlebar .t{flex:1;display:flex;align-items:center;justify-content:center;font-size:14.5px;font-weight:800;letter-spacing:-.5px;padding:9px 6px;text-align:center;line-height:1.2;word-break:keep-all;}
.gyeoljae{border-left:1px solid #8a94a0;flex:0 0 40%;max-width:160px;}
.gyeoljae table{width:100%;}
.gyeoljae td{text-align:center;padding:0;}
.gyeoljae .gj{writing-mode:vertical-rl;background:#eef1f5;font-size:10.5px;font-weight:700;width:20px;letter-spacing:2px;}
.gyeoljae .lab{background:#eef1f5;font-size:10.5px;font-weight:700;padding:4px 2px;}
.gj-b{background:#f6f8fa;}
.signcell{height:46px;cursor:pointer;position:relative;font-size:10px;color:#aeb6c0;}
.signcell.ph{color:#aeb6c0;}
.signcell img{max-width:100%;max-height:40px;display:block;margin:0 auto;}
.signcell .signname{font-size:10px;color:#333;}
.lb{background:#eef1f5;font-weight:700;text-align:center;font-size:11.5px;width:20%;}
.val{cursor:text;min-height:30px;}
.val:empty:before{content:attr(data-ph);color:#b0b8c2;font-weight:400;}
.val:focus{outline:2px solid #1565C0;outline-offset:-2px;background:#E8F1FB;}
.val select{width:100%;border:none;background:transparent;font-size:12px;font-family:inherit;padding:2px;}
.chkcell{text-align:center;}
.chk{display:inline-block;padding:3px 5px;cursor:pointer;font-size:12px;user-select:none;}
.chk.on{color:#1565C0;font-weight:800;}
.sec{background:#eef1f5;font-weight:800;text-align:center;font-size:12.5px;padding:7px;letter-spacing:-.3px;}
.secsub{font-weight:400;font-size:10.5px;color:#5b6470;}
.legend{font-size:10.5px;text-align:left;background:#f6f8fa;color:#444d57;padding:5px 8px;}
.sheet-secbar{background:#eef1f5;font-weight:800;text-align:center;font-size:12.5px;padding:7px;border-top:1px solid #8a94a0;}
.sheet-legend{font-size:10.5px;text-align:left;background:#f6f8fa;color:#444d57;padding:5px 8px;border-top:1px solid #8a94a0;}
.clh td{background:#eef1f5;font-weight:700;text-align:center;font-size:11px;}
.gubun{writing-mode:vertical-rl;text-orientation:upright;background:#f6f8fa;font-weight:800;font-size:12px;text-align:center;width:26px;letter-spacing:2px;color:#2a333d;}
.qcell{font-size:11.5px;line-height:1.45;}
.res{width:44px;text-align:center;cursor:pointer;font-size:17px;font-weight:800;}
.res.ph{color:#c2cad3;font-size:11px;font-weight:600;}
.res.r-ok{background:#E4F2E6;color:#1B7F2E;}
.res.r-warn{background:#FBEBD3;color:#D07A00;}
.res.r-bad{background:#F9E3E3;color:#C62828;}
.res.r-na{background:#ECEEF1;color:#7a828c;}
.actcell{width:92px;cursor:text;font-size:10.5px;color:#333;}
.actcell:empty:before{content:'—';color:#c2cad3;}
.actcell:focus,.qcell[contenteditable]:focus{outline:2px solid #1565C0;outline-offset:-2px;background:#E8F1FB;}
.bigcell{min-height:70px;cursor:text;font-size:11.5px;line-height:1.5;text-align:left;padding:8px;}
.bigcell:empty:before{content:attr(data-ph);color:#b0b8c2;}
.bigcell:focus{outline:2px solid #1565C0;outline-offset:-2px;background:#E8F1FB;}
.photowrap{padding:8px;}
.sheet .sub{background:#eef1f5;font-weight:800;text-align:center;font-size:12px;}
.clh2{background:#eef1f5;font-weight:700;text-align:center;font-size:10px;padding:4px 2px;}
.soso{font-size:9.5px;line-height:1.2;}
.soso.fixed{background:#fafbfc;color:#2a333d;text-align:center;font-size:9px;}
.att-pos{font-size:10px;padding:3px 2px;}
.soso.agmirror{text-align:center;color:#9aa5b1;}
.soso select{width:100%;border:none;background:transparent;font-size:9.5px;font-family:inherit;padding:2px 0;}
.signcell.empty{background:#fff;cursor:default;}
.photocell{padding:5px;}
.photocell .photo-grid,.photocell .pgrid{display:block;}
.sheet-pop{position:fixed;inset:0;background:rgba(10,20,30,.35);display:none;align-items:flex-end;justify-content:center;z-index:60;}
.sheet-pop.on{display:flex;}
.sheet-pop-card{background:#fff;width:100%;max-width:520px;border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));}
.sheet-pop-card h4{font-size:13px;color:#5b6470;margin-bottom:12px;text-align:center;font-weight:600;}
.judge4{display:flex;gap:9px;}
.judge4 button{flex:1;border:1.5px solid #8a94a0;background:#fff;border-radius:12px;padding:14px 0 10px;font-size:24px;font-weight:800;cursor:pointer;}
.judge4 button .l{display:block;font-size:11px;font-weight:600;margin-top:5px;color:#6b7480;}
.judge4 .j-ok{color:#1B7F2E;} .judge4 .j-warn{color:#D07A00;} .judge4 .j-bad{color:#C62828;} .judge4 .j-na{color:#7a828c;}
.sheet-modal{position:fixed;inset:0;background:rgba(10,20,30,.45);display:none;align-items:center;justify-content:center;z-index:70;padding:16px;}
.sheet-modal.on{display:flex;}
.sheet-modal-card{background:#fff;width:100%;max-width:460px;border-radius:16px;padding:16px;}
.sheet-modal-card h3{font-size:15px;margin-bottom:12px;}
.sheet-modal-card label{font-size:11px;font-weight:600;color:#5b6470;display:block;margin-bottom:5px;}
.sheet-modal-card .sm-name{width:100%;border:1px solid #8a94a0;border-radius:9px;padding:10px;font-size:14px;font-family:inherit;margin-bottom:12px;}
.sm-btns{display:flex;gap:9px;margin-top:12px;}
.sm-btns button{flex:1;border-radius:11px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;border:none;}
.sm-clear{background:#eef1f5;color:#5b6470;flex:0 0 90px;}
.sm-ok{background:#1565C0;color:#fff;}
/* 화면이 넓으면(태블릿/PC) 글자·여백을 키워 시원하게 */
@media (min-width:600px){
  .sheet td,.sheet th{font-size:13.5px;padding:7px 9px;}
  .titlebar .t{font-size:20px;}
  .lb,.clh td,.clh2,.sub{font-size:13px;}
  .qcell{font-size:13px;}
  .res{font-size:19px;}
  .sheet-meta{font-size:13px;}
}
@media (min-width:820px){
  .sheet td,.sheet th{font-size:14.5px;}
  .titlebar .t{font-size:22px;}
}
/* 아주 좁은 폰에서도 넘치지 않게 */
@media (max-width:360px){
  .sheet td,.sheet th{font-size:11px;padding:4px 4px;}
}
`
