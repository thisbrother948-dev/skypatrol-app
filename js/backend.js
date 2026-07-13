import { getConfig } from './config.js'

// opts: { url, fetchImpl } — 미지정 시 config/전역 fetch 사용(테스트에서 주입).
export async function submit(envelope, opts = {}) {
  const url = opts.url !== undefined ? opts.url : (getConfig().APPS_SCRIPT_URL || '')
  const fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null)

  if (!url) {
    // 목(로컬): URL 미설정
    await new Promise(r => setTimeout(r, 10)) // 네트워크 흉내
    if (envelope._fail) return { ok: false, error: '목: 강제 실패', retryable: true }
    return {
      ok: true,
      docId: envelope.docId,
      pdfUrl: `mock://drive/${envelope.branch}/${envelope.formId}/${envelope.fileName}.pdf`,
      savedAt: envelope.savedAt,
    }
  }
  try {
    const res = await fetchImpl(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(envelope),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, retryable: true }
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.error || 'server', retryable: true }
    return { ok: true, docId: data.docId, pdfUrl: data.pdfUrl, savedAt: data.savedAt }
  } catch (e) {
    return { ok: false, error: String(e), retryable: true }
  }
}

export async function saveWithQueue(envelope, deps) {
  const { submit: doSubmit, setSync, online } = deps
  if (!online) { await setSync(envelope.docId, 'pending'); return { ok: false, queued: true } }
  try {
    const r = await doSubmit(envelope)
    if (r.ok) { await setSync(envelope.docId, 'done'); return { ok: true, pdfUrl: r.pdfUrl } }
    await setSync(envelope.docId, 'error')
    return { ok: false, error: r.error, retryable: r.retryable }
  } catch (e) {
    await setSync(envelope.docId, 'error')
    return { ok: false, error: String(e), retryable: true }
  }
}

// 안정성 핵심: 로컬 즉시 저장 후 업로드 시도. 실패/오프라인은 pending으로 남아 flushPending이 재시도.
export async function syncSave(doc, deps) {
  const { saveLocal, remoteSave, online } = deps
  if (!online) {
    try {
      await saveLocal({ ...doc, sync: 'pending' })
    } catch (e) {
      return { ok: false, retryable: true, error: String(e) }
    }
    return { ok: false, queued: true }
  }
  try {
    await saveLocal({ ...doc, sync: 'pending' })
  } catch (e) {
    return { ok: false, retryable: true, error: String(e) }
  }
  let r
  try {
    r = await remoteSave(doc)
  } catch (e) {
    return { ok: false, retryable: true, error: String(e) }
  }
  if (r.ok) {
    try {
      await saveLocal({ ...doc, rev: r.rev, sync: 'synced' })
    } catch (e) {
      return { ok: false, retryable: true, error: String(e) }
    }
    return { ok: true, rev: r.rev, pdfUrl: r.pdfUrl }
  }
  if (r.conflict) {
    try {
      await saveLocal({ ...doc, sync: 'conflict' })
    } catch (e) {
      return { ok: false, retryable: true, error: String(e) }
    }
    return { ok: false, conflict: true, currentRev: r.currentRev }
  }
  // 네트워크 실패: pending 유지(재시도)
  return { ok: false, retryable: true, error: r.error }
}

export async function flushPending(deps) {
  const { listPending, remoteSave, saveLocal } = deps
  const pend = await listPending()
  const results = []
  for (const doc of pend) {
    try {
      const r = await remoteSave(doc)
      if (r.ok) {
        try {
          await saveLocal({ ...doc, rev: r.rev, sync: 'synced' })
        } catch (e) {
          results.push({ docId: doc.docId, ok: false, error: String(e) })
          continue
        }
        results.push({ docId: doc.docId, ok: true })
      }
      else if (r.conflict) {
        try {
          await saveLocal({ ...doc, sync: 'conflict' })
        } catch (e) {
          results.push({ docId: doc.docId, ok: false, error: String(e) })
          continue
        }
        results.push({ docId: doc.docId, conflict: true })
      }
      else results.push({ docId: doc.docId, ok: false })
    } catch (e) {
      results.push({ docId: doc.docId, ok: false, error: String(e) })
    }
  }
  return results
}
