// Reduz o print antes de guardar: cada imagem precisa caber num documento do Firestore (< 1 MB).
const MAX_SIDE = 1600
const MAX_CHARS = 700_000

function loadBitmap(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Imagem inválida"))
    }
    image.src = url
  })
}

/** Converte a imagem em WebP (ou JPEG) reduzindo lado e qualidade até caber no limite. */
export async function compressImage(file: Blob): Promise<string> {
  const image = await loadBitmap(file)
  let scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Navegador sem suporte a imagens")
  for (let attempt = 0; attempt < 6; attempt++) {
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.8, 0.65, 0.5]) {
      let data = canvas.toDataURL("image/webp", quality)
      if (!data.startsWith("data:image/webp")) data = canvas.toDataURL("image/jpeg", quality)
      if (data.length <= MAX_CHARS) return data
    }
    scale *= 0.75
  }
  throw new Error("Imagem grande demais")
}
