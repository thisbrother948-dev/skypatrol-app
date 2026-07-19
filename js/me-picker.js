import { rosterPeople, rolesOf } from './identity.js'

const ROLE_LABEL = { manager: '지사장', safetyLead: '산업안전총괄', staff: '담당' }

// 첫 실행·신원 무효 시 "누구세요?" 화면. 건너뛸 수 없다 — 건너뛰게 하면 author 없는 문서가 쌓여 목적 자체가 무너진다.
export function renderMePicker(root, { meta, onPick } = {}) {
  const people = rosterPeople(meta)
  const btn = n => {
    const roles = rolesOf(n, meta).map(r => ROLE_LABEL[r]).filter(Boolean).join(' · ')
    return `<button class="me-btn" data-name="${n}"><span class="me-name">${n}</span><span class="me-role">${roles}</span></button>`
  }
  const list = people.length
    ? people.map(btn).join('')
    : '<div class="empty-hint">명단을 불러오지 못했습니다. 네트워크를 확인하고 새로고침해주세요.</div>'
  root.innerHTML = `
    <div class="me-title">누구세요?</div>
    <div class="me-sub">${meta?.branch || ''} · 이 기기를 쓰는 본인을 골라주세요. 나중에 홈에서 바꿀 수 있습니다.</div>
    <div class="me-list">${list}</div>`
  root.querySelectorAll('.me-btn').forEach(b =>
    b.addEventListener('click', () => onPick && onPick(b.dataset.name)))
}
