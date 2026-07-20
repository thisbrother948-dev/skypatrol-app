async function call(action, payload, { url, fetchImpl }) {
  const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null)
  if (!url || !f) return { ok: false, error: 'no url', retryable: true }
  try {
    const res = await f(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, retryable: true }
    return await res.json()
  } catch (e) {
    return { ok: false, error: String(e), retryable: true }
  }
}

export const list = (opts) => call('list', {}, opts)
export const getDoc = (docId, opts) => call('get', { docId }, opts)
export const saveDoc = (doc, opts) => call('save', { doc }, opts)
export const roster = (opts) => call('roster', {}, opts)
export const deleteDoc = (docId, opts) => call('delete', { docId }, opts)
