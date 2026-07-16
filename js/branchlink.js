// 지사 별칭(slug)을 별칭 표에서 찾아 { branch, api } 반환. 없으면 null.
// slug는 URL 쿼리 ?b=<slug> 에서 온다. 순수 함수 — 부팅 시 index.html이 결과로 setConfig 한다.
export function resolveBranchLink(slug, links) {
  const key = String(slug || '').trim().toLowerCase()
  if (!key || !links || !links[key]) return null
  const l = links[key]
  return { branch: l.branch || '', api: l.api || '' }
}
