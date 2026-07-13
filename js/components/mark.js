const MARKS = [
  { m: '○', cls: 'sel-ok', lbl: '적합' },
  { m: '△', cls: 'sel-warn', lbl: '미흡' },
  { m: '✕', cls: 'sel-bad', lbl: '부적합' },
  { m: '−', cls: 'sel-na', lbl: '해당없음' },
]
export function createMark(current, onChange) {
  const wrap = document.createElement('div')
  wrap.className = 'judge'
  for (const { m, cls, lbl } of MARKS) {
    const b = document.createElement('button')
    b.type = 'button'; b.dataset.mark = m
    b.innerHTML = `${m}<span class="lbl">${lbl}</span>`
    if (current === m) b.classList.add('on', cls)
    b.addEventListener('click', () => {
      wrap.querySelectorAll('button').forEach(x => x.className = '')
      b.classList.add('on', cls)
      onChange(m)
    })
    wrap.appendChild(b)
  }
  return wrap
}
