import { nextStatus, STATUS } from './docstatus.js'

export async function applySignature(docIds, field, png, deps) {
  const { getDoc, saveDoc, now } = deps
  const applied = [], failed = []
  for (const id of docIds) {
    try {
      const doc = await getDoc(id)
      if (!doc) { failed.push(id); continue }
      await saveDoc({ ...doc, values: { ...doc.values, [field]: png }, savedAt: now() })
      applied.push(id)
    } catch { failed.push(id) }
  }
  return { applied, failed }
}

function bytesToBase64(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export async function completeDocs(docIds, deps) {
  const { getDoc, saveDoc, submit, setSync, online, now, renderPdf } = deps
  const completed = [], queued = [], failed = []
  for (const id of docIds) {
    try {
      const doc = await getDoc(id)
      if (!doc) { failed.push(id); continue }

      let pdfBase64
      if (renderPdf) {
        try {
          const bytes = await renderPdf(doc)   // doc → Uint8Array
          pdfBase64 = bytesToBase64(bytes)
        } catch {
          // 렌더 실패: draft 유지, 데이터 보존
          try { await setSync(id, 'error') } catch {}
          failed.push(id); continue
        }
      }

      const savedAt = now()
      const env = {
        branch: doc.branch, formId: doc.formId, docId: doc.docId,
        fileName: doc.fileName, status: 'done', values: doc.values, savedAt, pdfBase64,
      }
      if (!online) {
        // 오프라인: 낙관적으로 done 처리 후 큐에 적재, flushQueue가 나중에 전송
        await saveDoc({ ...doc, status: 'done', sync: 'pending', savedAt, pdfBase64 })
        queued.push(id)
        continue
      }
      const r = await submit(env)
      if (r.ok) {
        await saveDoc({ ...doc, status: 'done', savedAt })
        await setSync(id, 'done')
        completed.push(id)
      } else {
        // 온라인 실패: status는 그대로 두어 완료 대기 목록에서 사라지지 않게 함
        await setSync(id, 'error')
        failed.push(id)
      }
    } catch {
      try { await setSync(id, 'error') } catch {}
      failed.push(id)
    }
  }
  return { completed, queued, failed }
}

export async function revertToDraft(docId, deps) {
  const { getDoc, saveDoc, now } = deps
  const doc = await getDoc(docId)
  if (!doc) return null
  const updated = { ...doc, status: 'draft', savedAt: now() }
  await saveDoc(updated)
  return updated
}

export async function makePdfNow(doc, deps) {
  return await deps.renderPdf(doc)   // 상태 무관, 현재 값으로. 아무때나 미리보기/저장.
}

export async function advance(docId, action, deps) {
  const { getDoc, syncSave, renderPdf } = deps
  const doc = await getDoc(docId)
  if (!doc) return { ok: false, error: 'not found' }
  const status = nextStatus(doc.status, action)
  const next = { ...doc, status }
  if (status === STATUS.DONE && renderPdf) {
    try { next.pdfBase64 = bytesToBase64(await renderPdf(doc)) } catch { return { ok: false, error: 'render' } }
  }
  return await syncSave(next, deps)
}
