export function createPhotoGrid(max, onChange) {
  const photos = []
  const el = document.createElement('div')
  el.className = 'photo-grid'
  const addLabel = document.createElement('label')
  addLabel.className = 'photo-slot photo-add'
  addLabel.innerHTML = `<span class="ico">📷</span><span>사진 추가</span>
    <input type="file" accept="image/*" capture="environment" hidden>`
  const input = addLabel.querySelector('input')
  input.addEventListener('change', () => {
    const f = input.files[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => { add(r.result) }
    r.readAsDataURL(f)
    input.value = ''
  })
  function render() {
    el.querySelectorAll('.photo-thumb').forEach(n => n.remove())
    photos.forEach((src, i) => {
      const slot = document.createElement('div')
      slot.className = 'photo-slot photo-thumb'
      slot.innerHTML = `<img src="${src}"><button type="button" class="rm">×</button>`
      slot.querySelector('.rm').addEventListener('click', () => { photos.splice(i, 1); render(); onChange(photos.slice()) })
      el.insertBefore(slot, addLabel)
    })
    addLabel.hidden = photos.length >= max
  }
  function add(dataURL) {
    if (photos.length >= max) return
    photos.push(dataURL); render(); onChange(photos.slice())
  }
  el.appendChild(addLabel); render()
  return { el, get: () => photos.slice(), add }
}
