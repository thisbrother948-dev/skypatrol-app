const suSlots = []
for (let i = 0; i < 7; i++) {
  const r = 8 + i
  suSlots.push({ key: `att_su${i + 1}`, type: 'attendee-sign', label: `수급인 · 대리점 ${i + 1}`, affiliationInput: true, sosoCell: `F${r}`, posCell: `G${r}:H${r}`, signCell: `I${r}:J${r}` })
}
const AGREEMENTS = [
  '작업 일정 및 작업 시 유의사항',
  '작업장 간 연락방법',
  '재해 발생 위험이 있는 경우 대피방법',
  '위험성평가의 실시에 관한 사항',
  '기타 심의 및 의결사항',
]
const agreementRows = AGREEMENTS.map((label, i) => ({ no: i + 1, label, cell: `D${21 + i}:J${21 + i}` }))

export default {
  id: 'hoeuirok',
  title: '안전보건협의체 회의록',
  menuTitle: '협의체 회의록',
  sheetDims: 'A1:J25',
  naming: { by: 'branch', label: '협의체회의록' },
  fields: [
    { key: 'meetingDate', type: 'text', label: '일시', cell: 'B4:E4' },
    { key: 'meetingType', type: 'choice', label: '회의방식', options: ['대면', '화상'], cell: 'G4:J4',
      // 원본 템플릿의 각 옵션 □ 위치(pdf-lib 좌하단 원점, pdfplumber 추출). 선택 옵션에 체크 표시.
      optionMarks: { '대면': [368.6, 730.7], '화상': [495.1, 730.7] } },
    { key: 'month', type: 'month', label: '월', default: 'currentMonth' },
    { key: 'round', type: 'round', label: '차수', default: 'autoNext' },
    { key: 'sigManager', type: 'signature', label: '담당 서명', cell: 'I2:I3' },
    { key: 'att_dogupin', type: 'attendee-sign', label: '도급인 · KT스카이라이프', affiliation: 'KT스카이라이프', namePrefill: 'manager', posCell: 'B8:C8', signCell: 'D8:E8', sosoCell: 'A8' },
    ...suSlots,
    { key: 'prevAgenda', type: 'text', label: '전 회차 협의항목', cell: 'A17:D17' },
    { key: 'prevResult', type: 'text', label: '조치결과', cell: 'E17:G17' },
    { key: 'prevPhoto', type: 'photos', label: '조치사진', max: 1, cells: ['H17:J17'] },
    { key: 'agreements', type: 'text-list', label: '협의사항 (산안법 시행규칙 제79조)', rows: agreementRows },
    { key: 'sigConfirmer', type: 'signature', label: '승인(지사장) 서명', cell: 'J2:J3', stage: 'approval' },
  ],
}
