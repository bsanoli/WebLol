// Banco online (Firebase Auth e Firestore), carregado do CDN da Google só quando alguém precisa dele.
// Coleções e campos são contratos: não mudam sem migração e ADR.
// Configuração pública do projeto Firebase (não é segredo: quem protege os dados são as regras do banco).
const FB_CONFIG = {
  apiKey: "AIzaSyB5J_tjV5a6XTqZTjI09zeIgMiilcaQ5u4",
  authDomain: "weblol-42ef7.firebaseapp.com",
  projectId: "weblol-42ef7",
  storageBucket: "weblol-42ef7.firebasestorage.app",
  messagingSenderId: "214350102733",
  appId: "1:214350102733:web:3cb8d6f4137435f7e62984",
}
const FIREBASE_VERSION = "10.12.2"

// Só os trechos do SDK que o app usa; o SDK vem do CDN e não tem tipos aqui.
type FirebaseAuth = { currentUser: { email: string | null } | null }
type Doc = { exists(): boolean; data(): Record<string, unknown> }
type Query = { docs: { id: string; data(): Record<string, unknown> }[] }
export type FirebaseSession = {
  db: unknown
  auth: FirebaseAuth
  au: {
    signInWithEmailAndPassword(auth: FirebaseAuth, email: string, password: string): Promise<unknown>
    createUserWithEmailAndPassword(auth: FirebaseAuth, email: string, password: string): Promise<unknown>
    updatePassword(user: unknown, password: string): Promise<void>
    signOut(auth: FirebaseAuth): Promise<void>
    [name: string]: unknown
  }
  fs: {
    doc(db: unknown, collection: string, id: string): unknown
    collection(db: unknown, name: string): unknown
    getDoc(ref: unknown): Promise<Doc>
    setDoc(ref: unknown, data: unknown, options?: { merge?: boolean }): Promise<void>
    deleteDoc(ref: unknown): Promise<void>
    getDocs(query: unknown): Promise<Query>
    query(collection: unknown, ...constraints: unknown[]): unknown
    where(field: string, op: string, value: unknown): unknown
  }
}

export const IS_ONLINE = true
let session: FirebaseSession | null = null

/** Sessão já aberta, ou `null` enquanto ninguém chamou `fb()`. */
export const currentFirebase = () => session

export async function fb(): Promise<FirebaseSession> {
  if (session) return session
  const url = (name: string) => `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-${name}.js`
  const [app, au, fs] = await Promise.all([
    import(/* @vite-ignore */ url("app")),
    import(/* @vite-ignore */ url("auth")),
    import(/* @vite-ignore */ url("firestore")),
  ])
  const application = app.initializeApp(FB_CONFIG)
  const auth = au.getAuth(application)
  await new Promise<void>(resolve => {
    const off = au.onAuthStateChanged(auth, () => {
      off()
      resolve()
    })
  })
  session = { db: fs.getFirestore(application), auth, au, fs }
  return session
}

export async function dbGet(collection: string, id: string) {
  const { db, fs } = await fb()
  const snapshot = await fs.getDoc(fs.doc(db, collection, id))
  return snapshot.exists() ? snapshot.data() : null
}

export async function dbSet(collection: string, id: string, data: unknown, shouldMerge?: boolean) {
  const { db, fs } = await fb()
  await fs.setDoc(fs.doc(db, collection, id), data, shouldMerge ? { merge: true } : {})
}

export async function dbList(collection: string, field?: string, value?: unknown) {
  const { db, fs } = await fb()
  const all = fs.collection(db, collection)
  const result = await fs.getDocs(field ? fs.query(all, fs.where(field, "==", value)) : all)
  return result.docs.map(item => ({ id: item.id, ...item.data() }))
}

export async function dbDel(collection: string, id: string) {
  const { db, fs } = await fb()
  await fs.deleteDoc(fs.doc(db, collection, id))
}

/** Documento `{ json, at }` com um objeto dentro; `null` se não existe ou o JSON está quebrado. */
export async function getJ(collection: string, id: string) {
  const doc = await dbGet(collection, id)
  if (!doc) return null
  try {
    return JSON.parse(String(doc.json))
  } catch {
    return null
  }
}

export const putJ = (collection: string, id: string, value: unknown) =>
  dbSet(collection, id, { json: JSON.stringify(value), at: Date.now() })
