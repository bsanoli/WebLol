// Admins do app (Riot ID → e-mail no Firebase). Todos usam a mesma chave de admin, cada um com a sua senha.
export const ADMINS: Record<string, string> = {
  "brunoltz#ltz": "brunoltzinv@gmail.com",
  "panda#zada": "fabiano.rong@gmail.com",
}
// Impressão digital da chave do admin, fixa no app: um admin.json falso é recusado.
export const ADMIN_FP = "fdb898843944d55e"
