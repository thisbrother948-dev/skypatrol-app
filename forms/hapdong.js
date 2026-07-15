const ITEMS = [
  ['작업 안전', '고소작업 등 주요 위험작업 안전상태'],
  ['보호구', '보호구 착용 상태'],
  ['작업 환경', '작업 환경 위험요인 (미끄럼, 협소공간 등)'],
  ['작업 환경', '전기·통신 작업 시 감전 등 위험요인'],
  ['작업 관리', '작업 중 위험행동 여부'],
  ['작업 관리', '작업 중 주변 통제 및 제3자 접근 방지 여부'],
  ['작업 관리', '위험 시 작업중지 요청 및 이행 여부 확인'],
]
// §15-2: 항목 값 B14:E14~B20:E20, 마크 F14~F20, 조치 G14:J14~G20:J20
const rows = ITEMS.map(([group, label], i) => {
  const r = 14 + i
  return { no: i + 1, group, label, markCell: `F${r}`, actionCell: `G${r}:J${r}` }
})
rows.push({ no: 8, group: '기타', label: '', freeLabel: true, labelCell: 'B21:E21', markCell: 'F21', actionCell: 'G21:J21' })

export default {
  id: 'hapdong',
  title: '합동안전보건점검 실시 결과서',
  menuTitle: '합동점검',
  naming: { by: 'agency' },
  sheetDims: 'A1:J30',
  fields: [
    { key: 'agency', type: 'agency-select', label: '대리점(수급인)', required: true, cell: 'F8' },
    { key: 'inspectDate', type: 'date', label: '점검일', default: 'today', cell: 'B4:E4' },
    { key: 'place', type: 'text', label: '점검장소', cell: 'G4:J4' },
    { key: 'month', type: 'month', label: '월', default: 'currentMonth' },
    { key: 'round', type: 'round', label: '차수', default: 'autoNext' },
    { key: 'sigManager', type: 'signature', label: '담당 서명', cell: 'I2:I3' },
    { key: 'att_jisajang', type: 'attendee-sign', label: '도급인 · 지사장', affiliation: 'KT스카이라이프', namePrefill: 'manager', posCell: 'B8:C8', signCell: 'D8:E8', sosoCell: 'A8' },
    { key: 'att_jikwon', type: 'attendee-sign', label: '도급인 · 지사직원', affiliation: 'KT스카이라이프', suggestFrom: 'staff', posCell: 'B9:C9', signCell: 'D9:E9', sosoCell: 'A9' },
    { key: 'att_daerijeom1', type: 'attendee-sign', label: '수급인 · 대리점', sosoFrom: 'agency', posCell: 'G8:H8', signCell: 'I8:J8', sosoCell: 'F8' },
    { key: 'att_daerijeom2', type: 'attendee-sign', label: '수급인 · 대리점(2)', sosoFrom: 'agency', posCell: 'G9:H9', signCell: 'I9:J9', sosoCell: 'F9' },
    { key: 'items', type: 'checklist', rows },
    { key: 'summary', type: 'textarea', label: '종합 의견 및 개선사항', cell: 'A25:J26' },
    { key: 'photos', type: 'photos', label: '점검 사진', max: 4, cells: ['A28:B29', 'C28:E29', 'F28:H29', 'I28:J29'] },
    { key: 'sigConfirmer', type: 'signature', label: '승인(지사장) 서명', cell: 'J2:J3', stage: 'approval' },
  ],
}
