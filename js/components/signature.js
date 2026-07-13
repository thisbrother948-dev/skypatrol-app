export function createSignaturePad() {
  const el = document.createElement('div')
  el.className = 'sign-pad-wrap'
  el.innerHTML = `<canvas class="sign-pad" width="300" height="130"></canvas>
    <button type="button" class="sign-clear">지우기</button>`
  const canvas = el.querySelector('canvas')
  const ctx = canvas.getContext('2d')
  ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.strokeStyle = '#111820'
  let drawing = false, dirty = false, last = null

  function pos(e) {
    const r = canvas.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    const sx = canvas.width / (r.width || canvas.width)
    const sy = canvas.height / (r.height || canvas.height)
    return { x: ((t.clientX || 0) - r.left) * sx, y: ((t.clientY || 0) - r.top) * sy }
  }
  canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); canvas.setPointerCapture?.(e.pointerId) })
  canvas.addEventListener('pointermove', e => {
    if (!drawing) return
    const p = pos(e)
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); dirty = true; last = p
  })
  canvas.addEventListener('pointerup', () => { drawing = false })
  canvas.addEventListener('pointercancel', () => { drawing = false })
  el.querySelector('.sign-clear').addEventListener('click', () => clear())

  function clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false }
  return {
    el,
    isEmpty: () => !dirty,
    clear,
    getPNG: () => (dirty ? canvas.toDataURL('image/png') : null),
  }
}
