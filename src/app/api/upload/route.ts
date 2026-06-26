import { v2 as cloudinary } from 'cloudinary'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

function checkMagicBytes(buf: Buffer): boolean {
  const b = buf
  const isJpeg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF
  const isPng  = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47
  const isWebp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
               && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  const isGif  = b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38
  return isJpeg || isPng || isWebp || isGif
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only approved users may upload
  const { data: profileData } = await supabase.from('profiles').select('status').eq('id', user.id).single()
  if (!profileData || (profileData as { status: string }).status !== 'approved') {
    return NextResponse.json({ error: 'Hesabın onaylı değil.' }, { status: 403 })
  }

  // Rate limit: 30 uploads per user per hour
  if (!rateLimit(`upload:${user.id}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Çok sık yükleme yapıyorsun, lütfen bekle.' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Sadece JPEG, PNG, WebP ve GIF destekleniyor.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Dosya boyutu 10MB limitini aşıyor.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Verify actual file format via magic bytes (client-supplied MIME is untrustworthy)
    if (!checkMagicBytes(buffer)) {
      return NextResponse.json({ error: 'Geçersiz dosya formatı.' }, { status: 400 })
    }

    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'barek-forum',
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'webp', 'gif'],
      transformation: [{ width: 1600, crop: 'limit' }, { quality: 'auto' }],
    })

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id })
  } catch (e) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: 'Yükleme başarısız.' }, { status: 500 })
  }
}
