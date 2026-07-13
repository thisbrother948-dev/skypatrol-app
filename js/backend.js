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
