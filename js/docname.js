import { buildFileName } from './naming.js'

// def.naming.by: 'agency' (순회/합동) | 'branch' (회의록). Pure — year passed in.
export function buildDocMeta(def, v, existingDocId, yy) {
  const mm = String(v.month).padStart(2, '0')
  const byBranch = def.naming?.by === 'branch'
  if (byBranch) {
    return {
      byBranch: true,
      docId: existingDocId || `${def.id}-${yy}-${mm}-${v.round}`,
      fileName: buildFileName(def.naming.label, v.month, v.round),
      agency: null,
    }
  }
  return {
    byBranch: false,
    docId: existingDocId || `${def.id}-${yy}-${mm}-${v.agency}-${v.round}`,
    fileName: buildFileName(v.agency, v.month, v.round),
    agency: v.agency ?? null,
  }
}
