// Only images we uploaded to our own Cloudinary account, or Giphy CDN GIFs, may be attached to posts.
const CLOUDINARY_PREFIX = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/`
const GIPHY_RE = /^https:\/\/media\d?\.giphy\.com\//

export function isAllowedImage(img: { url?: unknown; publicId?: unknown }): boolean {
  if (typeof img.url !== 'string' || typeof img.publicId !== 'string') return false
  if (img.publicId.startsWith('giphy_')) return GIPHY_RE.test(img.url)
  return img.url.startsWith(CLOUDINARY_PREFIX)
}
