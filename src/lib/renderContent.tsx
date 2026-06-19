import React from 'react'

// Splits text on @mentions and highlights them.
// Avoids matching emails (user@example.com) by requiring @ not be preceded by a word char.
const MENTION_RE = /((?<!\w)@[a-zA-Z0-9_]+)/g

export function renderContent(content: string): React.ReactNode {
  const parts = content.split(MENTION_RE)
  return (
    <>
      {parts.map((part, i) =>
        /^(?<!\w)@[a-zA-Z0-9_]+$/.test(part) ? (
          <span key={i} className="text-[#c0392b] font-medium">{part}</span>
        ) : (
          part
        )
      )}
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
