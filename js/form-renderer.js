import { createMark } from './components/mark.js'
import { createPhotoGrid } from './components/photo.js'
import { createSignaturePad } from './components/signature.js'
import { getConfig, agencyNames, getMeta } from './config.js'

function field(key, labelText, inner) {
  const f = document.createElement('div')
  f.className = 'field'; f.dataset.key = key
  if (labelText) f.innerHTML = `<label>${labelText}</label>`
  f.appendChild(inner)
  return f
}

export function renderForm(def, values = {}, opts = {}) {
  const stage = opts.stage || 'input'
  const el = document.createElement('div')
  const getters = {}   // key -> ()=>value

  for (const f of def.fields) {
    if (f.type === 'signature') {
      const isApproval = f.stage === 'approval'
      if (stage === 'input' && isApproval) continue
      if (stage === 'approval' && !isApproval) continue
    }
    switch (f.type) {
      case 'agency-select': {
        const sel = document.createElement('select')
        const names = agencyNames().length ? agencyNames() : getConfig().agencies
        sel.innerHTML = '<option value="">대리점 선택</option>' +
          names.map(a => `<option${values.agency === a ? ' selected' : ''}>${a}</option>`).join('')
        el.appendChild(field(f.key, f.label, sel))
        getters[f.key] = () => sel.value
        break
      }
      case 'date': {
        const inp = document.createElement('input')
        inp.type = 'date'
        inp.value = values[f.key] || new Date().toISOString().slice(0, 10)
        el.appendChild(field(f.key, f.label, inp))
        getters[f.key] = () => inp.value
        break
      }
      case 'month': {
        const inp = document.createElement('input')
        inp.type = 'number'; inp.min = 1; inp.max = 12
        inp.value = values[f.key] || (new Date().getMonth() + 1)
        el.appendChild(field(f.key, f.label, inp))
        getters[f.key] = () => Number(inp.value)
        break
      }
      case 'round': {
        const inp = document.createElement('input')
        inp.type = 'number'; inp.min = 1
        inp.value = values[f.key] || 1
        el.appendChild(field(f.key, f.label, inp))
        getters[f.key] = () => Number(inp.value)
        break
      }
      case 'text': {
        const inp = document.createElement('input')
        inp.type = 'text'
        inp.value = values[f.key] || (f.prefill ? (getMeta()[f.prefill] || '') : '')
        if (f.suggestFrom === 'staff') {
          const dl = document.createElement('datalist'); const id = `dl-${f.key}`
          dl.id = id
          getMeta().staff.forEach(s => { const o = document.createElement('option'); o.value = s; dl.appendChild(o) })
          inp.setAttribute('list', id)
          el.appendChild(dl)
        }
        el.appendChild(field(f.key, f.label, inp))
        getters[f.key] = () => inp.value
        break
      }
      case 'textarea': {
        const ta = document.createElement('textarea')
        ta.value = values[f.key] || ''
        el.appendChild(field(f.key, f.label, ta))
        getters[f.key] = () => ta.value
        break
      }
      case 'choice': {
        const chips = document.createElement('div'); chips.className = 'chips'
        let chosen = values[f.key] || ''
        f.options.forEach(o => {
          const c = document.createElement('button')
          c.type = 'button'; c.className = 'chip' + (chosen === o ? ' on' : ''); c.textContent = o
          c.addEventListener('click', () => {
            chosen = o; chips.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); c.classList.add('on')
          })
          chips.appendChild(c)
        })
        el.appendChild(field(f.key, f.label, chips))
        getters[f.key] = () => chosen
        break
      }
      case 'checklist': {
        const box = document.createElement('div')
        const state = {}
        const initial = {}
        ;(values.items || []).forEach(i => { initial[i.no] = i })
        f.rows.forEach(row => {
          const item = document.createElement('div')
          item.className = 'item'; item.dataset.itemNo = row.no
          const cur = initial[row.no] || {}
          state[row.no] = {
            no: row.no, group: row.group,
            label: row.freeLabel ? (cur.label || '') : row.label,
            mark: cur.mark || null, action: cur.action || '',
          }
          if (row.freeLabel) {
            const q = document.createElement('div'); q.className = 'q'
            q.innerHTML = `<span class="cat">${row.group}</span>${row.no}. `
            const labelInp = document.createElement('input')
            labelInp.className = 'act-input'; labelInp.placeholder = '기타 점검항목 입력'; labelInp.value = cur.label || ''
            labelInp.addEventListener('input', () => { state[row.no].label = labelInp.value })
            q.appendChild(labelInp)
            item.appendChild(q)
          } else {
            item.innerHTML = `<div class="q"><span class="cat">${row.group}</span>${row.no}. ${row.label}</div>`
          }
          item.appendChild(createMark(cur.mark || null, m => { state[row.no].mark = m }))
          const act = document.createElement('input')
          act.className = 'act-input'; act.placeholder = '조치사항(선택)'; act.value = cur.action || ''
          act.addEventListener('input', () => { state[row.no].action = act.value })
          item.appendChild(act)
          box.appendChild(item)
        })
        el.appendChild(field(f.key, f.label, box))
        getters[f.key] = () => Object.values(state)
        break
      }
      case 'photos': {
        const grid = createPhotoGrid(f.max, () => {})
        ;(values[f.key] || []).forEach(d => grid.add(d))
        el.appendChild(field(f.key, f.label, grid.el))
        getters[f.key] = () => grid.get()
        break
      }
      case 'text-list': {
        const box = document.createElement('div')
        const state = {}
        const initial = {}
        ;(values[f.key] || []).forEach(i => { initial[i.no] = i })
        f.rows.forEach(row => {
          const item = document.createElement('div')
          item.className = 'item'; item.dataset.textNo = row.no
          item.innerHTML = `<div class="q">${row.no}. ${row.label}</div>`
          const ta = document.createElement('textarea')
          ta.className = 'act-input'; ta.value = (initial[row.no] && initial[row.no].text) || ''
          state[row.no] = { no: row.no, text: ta.value }
          ta.addEventListener('input', () => { state[row.no].text = ta.value })
          item.appendChild(ta)
          box.appendChild(item)
        })
        el.appendChild(field(f.key, f.label, box))
        getters[f.key] = () => Object.values(state)
        break
      }
      case 'attendee-sign': {
        const box = document.createElement('div')
        box.className = 'attendee'
        const cur = values[f.key] || {}
        let sosoInp = null
        if (f.affiliationInput) {
          sosoInp = document.createElement('input')
          sosoInp.className = 'att-soso-input'; sosoInp.placeholder = '대리점명'; sosoInp.value = cur.soso || ''
          box.appendChild(sosoInp)
        } else {
          const sosoText = f.affiliation || (f.sosoFrom ? (values[f.sosoFrom] || '') : '')
          if (sosoText) {
            const aff = document.createElement('div'); aff.className = 'att-soso'; aff.textContent = sosoText
            box.appendChild(aff)
          }
        }
        const posInp = document.createElement('input')
        posInp.className = 'att-pos'; posInp.placeholder = '직위'; posInp.value = cur.title || ''
        const nameInp = document.createElement('input')
        nameInp.className = 'att-name'; nameInp.placeholder = '이름'
        nameInp.value = cur.name || (f.namePrefill ? (getMeta()[f.namePrefill] || '') : '')
        if (f.suggestFrom === 'staff') {
          const dl = document.createElement('datalist'); const id = `dl-${f.key}-name`
          dl.id = id
          getMeta().staff.forEach(s => { const o = document.createElement('option'); o.value = s; dl.appendChild(o) })
          nameInp.setAttribute('list', id)
          box.appendChild(dl)
        }
        const pad = createSignaturePad()
        const prevSign = cur.sign || null
        box.appendChild(posInp); box.appendChild(nameInp); box.appendChild(pad.el)
        el.appendChild(field(f.key, f.label, box))
        getters[f.key] = () => {
          const out = { title: posInp.value, name: nameInp.value, sign: pad.getPNG() || prevSign }
          if (f.affiliationInput) out.soso = sosoInp.value
          return out
        }
        break
      }
      case 'signature': {
        const pad = createSignaturePad()
        const prev = values[f.key] || null
        el.appendChild(field(f.key, f.label, pad.el))
        getters[f.key] = () => pad.getPNG() || prev
        break
      }
      default: {
        console.warn('unknown field type: ' + f.type)
      }
    }
  }

  return {
    el,
    collect: () => {
      const out = {}
      for (const k in getters) out[k] = getters[k]()
      return out
    },
  }
}
