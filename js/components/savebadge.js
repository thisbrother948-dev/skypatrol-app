const TEXT = { idle: '저장하기', uploading: '저장 중…', done: '✓ 저장완료', queued: '✓ 오프라인 저장됨 · 전송 대기', error: '✗ 저장 실패 · 재시도' }
export function createSaveButton(onClick) {
  const el = document.createElement('button')
  el.type = 'button'; el.className = 'save-btn'; el.textContent = TEXT.idle
  el.addEventListener('click', onClick)
  function setState(s) {
    el.className = 'save-btn' + (s === 'idle' ? '' : ' ' + s)
    el.textContent = TEXT[s]
    el.disabled = s === 'uploading'
  }
  return { el, setState }
}
