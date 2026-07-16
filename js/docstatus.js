export const STATUS = { DRAFT: 'draft', CONFIRM: 'awaiting_confirm', APPROVE: 'awaiting_approve', DONE: 'done' }

const TRANSITIONS = {
  [STATUS.DRAFT]:   { submit: STATUS.CONFIRM },
  [STATUS.CONFIRM]: { confirmSign: STATUS.APPROVE, revert: STATUS.DRAFT },
  [STATUS.APPROVE]: { approve: STATUS.DONE, revert: STATUS.DRAFT },
  [STATUS.DONE]:    { revert: STATUS.DRAFT },
}

// 느슨: 정의된 전이가 없으면 현재 상태 유지(강제하지 않음).
export function nextStatus(cur, action) {
  const c = cur || STATUS.DRAFT
  return (TRANSITIONS[c] && TRANSITIONS[c][action]) || c
}

const QUEUE = { [STATUS.CONFIRM]: 'confirm', [STATUS.APPROVE]: 'approve', [STATUS.DONE]: 'done' }
export function queueOf(doc) {
  return QUEUE[doc && doc.status] || 'draft'
}

// 서명이 모두 끝난 단계에서만 공식 PDF 저장(다운로드)이 의미 있다.
export function canSaveFinalPdf(status) {
  return status === STATUS.APPROVE || status === STATUS.DONE
}
