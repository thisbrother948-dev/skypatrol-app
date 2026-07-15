const DOC = [
  '관리감독자 지정 여부 및 지정서 보유 여부',
  '관리감독자 교육 이수 여부 확인 (연간 16시간)',
  '비상연락망 체계 구축 여부',
  '산업안전보건법령 요지 및 안전보건 관련 게시물 게시 여부',
  '근로자 보건관리 실시 여부 (건강검진, 작업 전 건강확인 등)',
  '안전보건교육 실시 여부 (신규·정기 등)',
  '보호구 지급 및 관리 상태',
  '위험성평가 실시 여부',
]
const SITE = [
  '수공구 및 작업장비 상태 이상 여부 (파손, 노후 등)',
  '보호구 착용 상태',
  '사다리 안전상태 (아웃트리거, 지지상태 등)',
  '안전대 체결 여부',
  '작업 환경 위험요인 (미끄럼, 협소공간 등)',
  '작업 중 위험행동 여부',
  '전기·통신 작업 시 감전 등 위험요인 관리 여부',
  '작업 중 주변 통제 및 제3자 접근 방지 여부',
  '위험 시 작업중지 요청 및 이행 여부 확인',
]
// §15-1: 점검항목 값 B11:E11~B27:E27, 마크 F11~F27, 조치 G11:J11~G27:J27
const rows = []
;[...DOC.map(l => ['서류점검', l]), ...SITE.map(l => ['작업현장점검', l])].forEach(([group, label], i) => {
  const r = 11 + i
  rows.push({ no: i + 1, group, label, markCell: `F${r}`, actionCell: `G${r}:J${r}` })
})
rows.push({ no: 18, group: '기타', label: '', freeLabel: true, labelCell: 'B28:E28', markCell: 'F28', actionCell: 'G28:J28' })

export default {
  id: 'sunhoe',
  title: '도급사업 작업장 순회점검 일지',
  menuTitle: '순회점검',
  naming: { by: 'agency' },
  sheetDims: 'A1:J36',
  fields: [
    { key: 'agency', type: 'agency-select', label: '대리점(수급인)', required: true, cell: 'B5:E5' },
    { key: 'inspectDate', type: 'date', label: '점검일', default: 'today', cell: 'B4:E4' },
    { key: 'month', type: 'month', label: '월', default: 'currentMonth' },
    { key: 'round', type: 'round', label: '차수', default: 'autoNext' },
    { key: 'inspector', type: 'text', label: '점검자', cell: 'G4:J4', suggestFrom: 'staff', defaultFrom: 'agencyContact' },
    { key: 'place', type: 'text', label: '점검장소', cell: 'G5:J5' },
    { key: 'workContent', type: 'text', label: '작업내용', cell: 'B6:E6' },
    { key: 'workType', type: 'choice', label: '작업유형', options: ['설치', 'A/S', '기타'], cell: 'G6:J6',
      // 원본 템플릿의 각 옵션 □ 위치(pdf-lib 좌하단 원점, pdfplumber 추출). 선택 옵션에 체크 표시.
      optionMarks: { '설치': [379.5, 669.6], 'A/S': [432.3, 669.6], '기타': [483.0, 669.6] } },
    { key: 'purpose', type: 'text', label: '점검목적', cell: 'B7:J7' },
    { key: 'items', type: 'checklist', rows },
    { key: 'summary', type: 'textarea', label: '종합 의견 및 개선사항', cell: 'A31:J32' },
    { key: 'photos', type: 'photos', label: '점검 사진', max: 4, cells: ['A34:B35', 'C34:E35', 'F34:H35', 'I34:J35'] },
    { key: 'sigInspector', type: 'signature', label: '점검자 서명', cell: 'I2:I3' },
    { key: 'sigConfirmer', type: 'signature', label: '확인자(지사장) 서명', cell: 'J2:J3', stage: 'approval' },
  ],
}
