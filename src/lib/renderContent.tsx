import React from 'react'
import Link from 'next/link'

// Matches URLs and @mentions as tokens to split on
const TOKEN_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+|(?<!\w)@[a-zA-Z0-9_]+)/g

// Strip trailing punctuation unlikely to be part of the URL
function cleanUrl(url: string): string {
  return url.replace(/[.,;:!?)'"\]>]+$/, '')
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch {}
  return null
}

export function renderContent(content: string): React.ReactNode {
  const parts = content.split(TOKEN_RE)
  const youtubeIds: string[] = []

  const inlineNodes = parts.map((part, i) => {
    if (part.startsWith('@') && /^@[a-zA-Z0-9_]+$/.test(part)) {
      return (
        <Link key={i} href={`/profile/${part.slice(1)}`} className="text-[#c0392b] font-medium hover:underline">
          {part}
        </Link>
      )
    }

    if (part.startsWith('http')) {
      const url = cleanUrl(part)
      const ytId = getYouTubeId(url)
      if (ytId && !youtubeIds.includes(ytId)) youtubeIds.push(ytId)
      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#c0392b] underline break-all hover:text-[#e05050] transition-colors"
        >
          {url}
        </a>
      )
    }

    return part
  })

  const youtubePreviews = youtubeIds.map((id) => (
    <a
      key={id}
      href={`https://www.youtube.com/watch?v=${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-3 border border-[#2a2a2a] overflow-hidden hover:border-[#8b1a1a] transition-colors max-w-xs group"
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
          alt="YouTube video"
          className="w-full block"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
          <div className="w-10 h-10 bg-[#ff0000] rounded-full flex items-center justify-center">
            <span className="text-white text-xs ml-0.5">▶</span>
          </div>
        </div>
      </div>
      <div className="px-3 py-1.5 bg-[#1a1a1a] text-xs text-[#6b6b6b]">youtube.com</div>
    </a>
  ))

  return (
    <>
      {inlineNodes}
      {youtubePreviews}
    </>
  )
}

export function parseMentions(content: string): string[] {
  const matches: string[] = []
  let m: RegExpExecArray | null
  const re = /(?<!\w)@([a-zA-Z0-9_]+)/g
  while ((m = re.exec(content)) !== null) {
    matches.push(m[1])
  }
  return [...new Set(matches)]
}
