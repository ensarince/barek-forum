// Only images we uploaded to our own Cloudinary account, or Giphy CDN GIFs, may be attached to posts.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_PATH_PREFIX = `/${CLOUD_NAME}/image/upload/`
const GIPHY_HOST_RE = /^media\d?\.giphy\.com$/

/** A plain https URL on our own Cloudinary upload path (used for avatars). */
export function isOurCloudinaryUrl(url: string): boolean {
  return isAllowedImage({ url, publicId: 'avatar' })
}

export function isAllowedImage(img: { url?: unknown; publicId?: unknown }): boolean {
  if (typeof img.url !== 'string' || typeof img.publicId !== 'string') return false
  if (img.url.length > 1000 || img.publicId.length > 300) return false
  // Browsers resolve "../" (also encoded) before fetching, so a raw prefix check could be
  // escaped into another Cloudinary account or its fetch proxy — reject those outright
  if (/\.\.|%2e/i.test(img.url)) return false

  let parsed: URL
  try { parsed = new URL(img.url) } catch { return false }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return false

  if (img.publicId.startsWith('giphy_')) return GIPHY_HOST_RE.test(parsed.hostname)
  return !!CLOUD_NAME && parsed.hostname === 'res.cloudinary.com' && parsed.pathname.startsWith(CLOUDINARY_PATH_PREFIX)
}
