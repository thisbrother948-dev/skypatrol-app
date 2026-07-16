// 지사 별칭 → { 지사명, Apps Script URL }. 빌더가 관리.
// 사용: https://…/skypatrol-app/#daegu  → 앱이 해당 지사로 자동 연결.
// 새 지사 연결 = 해당 slug의 api에 배포 URL 채우고 재푸시. api 빈 값이면 미배포(로컬/placeholder).
export const BRANCH_LINKS = {
  daegu:       { branch: '대구경북지사', api: 'https://script.google.com/macros/s/AKfycbwS6MzppAkAbbipkmUWnaXxqEjHoPxRHOxg_13lQV06y3ler_8nPAuMWEo_PLIT8Fo/exec' },
  busan:       { branch: '부산경남지사', api: '' },
  gangnam:     { branch: '강남지사',     api: '' },
  gangbuk:     { branch: '강북지사',     api: '' },
  gangseo:     { branch: '강서지사',     api: '' },
  gangwon:     { branch: '강원지사',     api: '' },
  chungcheong: { branch: '충남충북지사', api: '' },
  jeolla:      { branch: '전남전북지사', api: '' },
}
