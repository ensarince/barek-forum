// Shrink big phone photos in the browser before upload.
// Vercel rejects request bodies over ~4.5 MB, and phone photos are often bigger than that.

const MAX_DIMENSION = 2048
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export async function compressImage(file: File): Promise<File> {
  // GIFs would lose their animation; small files are fine as they are
  if (file.type === 'image/gif' || file.size <= SKIP_BELOW_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Browser couldn't decode it (e.g. some HEIC) — send the original and let the size check decide
    return file
  }
}
