import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rateLimit'

const API_KEY = process.env.GIPHY_API_KEY!
const BASE = 'https://api.giphy.com/v1/gifs'

interface GiphyImage { url: string }
interface GiphyItem {
  id: string
  title: string
  images: {
    fixed_width_small?: GiphyImage
    fixed_width?: GiphyImage
    downsized?: GiphyImage
    original?: GiphyImage
  }
}
interface GiphyResponse { data: GiphyItem[] }

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ gifs: [] }, { status: 401 })

  // Approved members only — protects our Giphy API quota
  const { data: me } = await supabase.from('profiles').select('status').eq('id', user.id).single()
  if ((me as { status: string } | null)?.status !== 'approved') return NextResponse.json({ gifs: [] }, { status: 403 })
  if (!await rateLimit(`giphy:${user.id}`, 120, 10 * 60 * 1000)) return NextResponse.json({ gifs: [] }, { status: 429 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  const endpoint = q
    ? `${BASE}/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`
    : `${BASE}/trending?api_key=${API_KEY}&limit=24&rating=g`

  const res = await fetch(endpoint, { next: { revalidate: 60 } })
  if (!res.ok) return NextResponse.json({ gifs: [] })

  const json = await res.json() as GiphyResponse

  const gifs = json.data.map((item) => ({
    id: item.id,
    title: item.title,
    previewUrl: item.images.fixed_width_small?.url ?? item.images.fixed_width?.url ?? '',
    url: item.images.downsized?.url ?? item.images.original?.url ?? '',
  }))

  return NextResponse.json({ gifs })
}
