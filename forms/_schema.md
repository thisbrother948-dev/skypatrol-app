# 양식 정의 규격
양식 하나 = `{ id, title, sheetDims, fields[] }`.
fields[].type 별 렌더링/수집/셀매핑:
- agency-select: 설정 대리점 목록 드롭다운 → values[key]=선택 문자열, cell에 기록
- date/text/textarea: 값 그대로, cell에 기록
- month: 숫자(1~12), 파일명·차수 계산에 사용(셀 없음)
- round: 숫자, 파일명 계산(셀 없음). 기본값 autoNext
- choice: options[] 중 1택, cell에 기록
- choice(작업유형)는 순회 §6-1 ☐설치/☐A/S/☐기타
- checklist: rows[] 각 {markCell(단일셀), actionCell(범위)}. values.items=[{no,mark,action}]
- photos: max, cells[]. values[key]=dataURL[]
- signature: stage 옵션('approval'이면 지사장 승인 단계). values[key]=PNG dataURL
셀 좌표는 PRD §15에서 실측. 양식 변경 시 이 파일 정의만 수정 → 화면·PDF 동시 반영.
