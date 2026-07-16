// 해시(#slug)를 지사 별칭 표에서 찾아 { branch, api } 반환. 없으면 null.
// 순수 함수 — 부팅 시 index.html이 결과로 setConfig 한다.
export function resolveBranchLink(hash, links) {
  const slug = String(hash || '').replace(/^#/, '').trim().toLowerCase()
  if (!slug || !links || !links[slug]) return null
  const l = links[slug]
  return { branch: l.branch || '', api: l.api || '' }
}
