import React from 'react'
import Link from 'next/link'

// Matches URLs (capped at 2048 chars) and @mentions as tokens to split on
const TOKEN_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]{1,2048}|(?<!\w)@[a-zA-Z0-9_]+)/g

const TRAILING_PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?', ')', "'", '"', ']', '>'])

// Strip trailing punctuation unlikely to be part of the URL. A backwards loop instead of a
// /[...]+$/ regex, which takes quadratic time on long runs of punctuation (server-side, every view).
function cleanUrl(url: string): string {
  let end = url.length
  while (end > 0 && TRAILING_PUNCTUATION.has(url[end - 1])) end--
  return url.slice(0, end)
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])
const YOUTUBE_ID_RE = /^[\w-]{11}$/

// Exact hosts only ("youtube.com.evil.net" must not count) and a real 11-char video id
function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : YOUTUBE_HOSTS.has(u.hostname) ? u.searchParams.get('v') : null
    return id && YOUTUBE_ID_RE.test(id) ? id : null
  } catch {}
  return null
}

export function renderContent(content: string): React.ReactNode {
  const parts = content.split(TOKEN_RE)
  const youtubeIds: string[] = []

  const inlineNodes = parts.map((part, i) => {
    if (part.startsWith('@') && /^@[a-zA-Z0-9_]+$/.test(part)) {
      return (
        <Link key={i} href={`/profile/${part.slice(1)}`} className="text-[#e05a4a] font-medium hover:underline">
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
          className="text-[#e05a4a] underline break-all hover:text-[#e05050] transition-colors"
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
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full block"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
          <div className="w-10 h-10 bg-[#ff0000] rounded-full flex items-center justify-center">
            <span className="text-white text-xs ml-0.5">▶</span>
          </div>
        </div>
      </div>
      <div className="px-3 py-1.5 bg-[#1a1a1a] text-xs text-[#8a8a8a]">youtube.com</div>
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
