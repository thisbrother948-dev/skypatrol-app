const DB = 'skypatrol', STORE = 'docs', VER = 1

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VER)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'docId' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    const out = fn(store)
    t.oncomplete = () => { db.close(); resolve(out && Object.prototype.hasOwnProperty.call(out, '_result') ? out._result : out) }
    t.onerror = () => { db.close(); reject(t.error) }
  }))
}

export function saveDoc(doc) {
  return tx('readwrite', store => { store.put(doc); return { _result: doc } })
}
export function deleteDoc(docId) {
  return tx('readwrite', store => { store.delete(docId); return { _result: docId } })
}
export function getDoc(docId) {
  return tx('readonly', store => {
    const box = {}
    store.get(docId).onsuccess = e => { box._result = e.target.result }
    return box
  })
}
function all() {
  return tx('readonly', store => {
    const box = { _result: [] }
    store.getAll().onsuccess = e => { box._result = e.target.result }
    return box
  })
}
export async function listAll() {
  return all()
}
export async function listByStatus(status) {
  return (await all()).filter(d => d.status === status)
}
export async function listByAgencyForm(agency, formId) {
  return (await all()).filter(d => d.agency === agency && d.formId === formId)
}
export async function listByForm(formId) {
  return (await all()).filter(d => d.formId === formId)
}
export async function listBySync(sync) {
  return (await all()).filter(d => d.sync === sync)
}
export async function listOpen() {
  return (await all()).filter(d => d.status !== 'done')
}
export async function setSync(docId, sync) {
  const doc = await getDoc(docId)
  if (doc) await saveDoc({ ...doc, sync })
}
