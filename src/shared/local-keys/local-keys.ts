// IndexedDB "lol-time": guarda neste PC as chaves do admin já destrancadas.
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("lol-time", 1)
    request.onupgradeneeded = () => request.result.createObjectStore("kv")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

let database: Promise<IDBDatabase> | undefined

const run = <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) => {
  database ??= open()
  return database.then(
    db =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction("kv", mode)
        const request = work(tx.objectStore("kv"))
        tx.oncomplete = () => resolve(request?.result)
        tx.onerror = () => reject(tx.error)
      }),
  )
}

export const idbGet = (key: string) => run("readonly", store => store.get(key)).catch(() => null)
export const idbSet = (key: string, value: unknown) => run("readwrite", store => store.put(value, key))
export const idbDel = (key: string) => run("readwrite", store => store.delete(key))
