import base from './hoeuirok.js'

// 페이지2 수급인 13슬롯(att_su8~su20). su(8+k) → row(3+k). 균등 A:D/E:F/G:J.
const p2Slots = []
for (let k = 8; k <= 20; k++) {
  const r = 3 + (k - 8)
  p2Slots.push({
    key: `att_su${k}`, type: 'attendee-sign', label: `수급인 · 대리점 ${k}`,
    affiliationInput: true, page: 1,
    sosoCell: `A${r}:D${r}`, posCell: `E${r}:F${r}`, signCell: `G${r}:J${r}`,
  })
}

export default {
  ...base,
  id: 'hoeuirok_large',
  menuTitle: '협의체 회의록(다수 대리점)',
  pageCalib: ['hoeuirok_large', 'hoeuirok_large_p2'],
  fields: [...base.fields, ...p2Slots],
}
