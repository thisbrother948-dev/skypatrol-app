import base from './hoeuirok.js'

// 페이지1 서명부: 도급인(좌 A/B/C)·수급인(우 D/E/F) 각 20행, 데이터행 = 5+k.
const dogupin = [], sugupin = []
for (let k = 1; k <= 20; k++) {
  const r = 5 + k
  dogupin.push({
    key: `att_dogupin${k}`, type: 'attendee-sign', label: `도급인 ${k}`,
    ...(k === 1 ? { affiliation: 'KT스카이라이프', namePrefill: 'manager' } : { affiliationInput: true }),
    sosoCell: `A${r}`, posCell: `B${r}`, signCell: `C${r}`,
  })
  sugupin.push({
    key: `att_su${k}`, type: 'attendee-sign', label: `수급인 · 대리점 ${k}`,
    affiliationInput: true,
    sosoCell: `D${r}`, posCell: `E${r}`, signCell: `F${r}`,
  })
}

// 페이지2 텍스트 섹션.
const AGREEMENTS = [
  '작업 일정 및 작업 시 유의사항', '작업장 간 연락방법',
  '재해 발생 위험이 있는 경우 대피방법', '위험성평가의 실시에 관한 사항', '기타 심의 및 의결사항',
]
const agreementRows = AGREEMENTS.map((label, i) => ({ no: i + 1, label, cell: `B${6 + i}:C${6 + i}` }))

export default {
  ...base,
  id: 'hoeuirok_large',
  menuTitle: '협의체 회의록(다수 대리점)',
  pageCalib: ['hoeuirok_large', 'hoeuirok_large_p2'],
  fields: [
    { key: 'meetingDate', type: 'date', label: '일시', default: 'today', cell: 'B2:C2' },
    { key: 'meetingType', type: 'choice', label: '회의방식', options: ['대면', '화상'], cell: 'E2:F2',
      optionMarks: { '대면': [320, 731], '화상': [430, 731] } },  // 육안 QA서 확정
    { key: 'round', type: 'round', label: '차수', default: 'autoNext' },
    { key: 'sigManager', type: 'signature', label: '담당 서명', cell: 'I1:I1' },
    { key: 'sigConfirmer', type: 'signature', label: '승인(지사장) 서명', cell: 'J1:J1', stage: 'approval' },
    ...dogupin, ...sugupin,
    { key: 'prevAgenda', type: 'text', label: '전 회차 협의항목', page: 1, cell: 'A3' },
    { key: 'prevResult', type: 'text', label: '조치결과', page: 1, cell: 'B3' },
    { key: 'prevPhoto', type: 'photos', label: '조치사진', max: 1, page: 1, cells: ['C3:C3'] },
    { key: 'agreements', type: 'text-list', label: '협의사항 (산안법 시행규칙 제79조)', page: 1, rows: agreementRows },
  ],
}
