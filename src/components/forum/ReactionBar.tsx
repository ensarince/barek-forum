'use client'

import { useEffect, useRef, useState } from 'react'
import { Smile } from 'lucide-react'
import type { ReactionGroup } from '@/types/database'

const QUICK_EMOJIS = ['❤️', '👍', '🔥', '💪', '😂', '👀', '😮', '🎯']
const LONG_PRESS_MS = 450

interface ReactionBarProps {
  targetId: string
  targetType: 'topic' | 'post'
  initialReactions: ReactionGroup[]
  currentUsername: string
}

// Add or remove the current user's reaction for one emoji
function applyReaction(list: ReactionGroup[], emoji: string, add: boolean, username: string): ReactionGroup[] {
  const existing = list.find(r => r.emoji === emoji)
  if (add) {
    if (existing?.userReacted) return list
    if (existing) {
      return list.map(r => r.emoji === emoji
        ? { ...r, count: r.count + 1, userReacted: true, usernames: [...r.usernames, username] }
        : r)
    }
    return [...list, { emoji, count: 1, usernames: [username], userReacted: true }]
  }
  if (!existing?.userReacted) return list
  if (existing.count <= 1) return list.filter(r => r.emoji !== emoji)
  return list.map(r => r.emoji === emoji
    ? { ...r, count: r.count - 1, userReacted: false, usernames: r.usernames.filter(u => u !== username) }
    : r)
}

export default function ReactionBar({ targetId, targetType, initialReactions, currentUsername }: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionGroup[]>(initialReactions)
  const [loading, setLoading] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    if (pickerOpen) {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKey)
    }
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [pickerOpen])

  useEffect(() => () => { if (pressTimer.current) clearTimeout(pressTimer.current) }, [])

  // Hide the long-press name list on the next tap anywhere
  useEffect(() => {
    if (!tooltip) return
    function hide(e: PointerEvent) {
      if (e.pointerType !== 'mouse') setTooltip(null)
    }
    const id = setTimeout(() => document.addEventListener('pointerdown', hide), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('pointerdown', hide)
    }
  }, [tooltip])

  // Long-press shows who reacted — touch screens have no hover
  function startPress(emoji: string) {
    longPressed.current = false
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      setTooltip(emoji)
    }, LONG_PRESS_MS)
  }

  function endPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  async function toggle(emoji: string) {
    if (loading) return
    setLoading(emoji)
    setPickerOpen(false)

    const prevReactions = reactions
    const adding = !(reactions.find(r => r.emoji === emoji)?.userReacted ?? false)

    // Optimistic update
    setReactions(prev => applyReaction(prev, emoji, adding, currentUsername))

    try {
      const body = targetType === 'topic'
        ? { emoji, topic_id: targetId }
        : { emoji, post_id: targetId }
      const res = await fetch('/api/forum/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setReactions(prevReactions)
        return
      }
      // The server toggles based on what's in the DB. If our state was stale
      // (another tab, etc.) it did the opposite — follow the server.
      const data = await res.json().catch(() => ({})) as { reacted?: boolean }
      if (typeof data.reacted === 'boolean' && data.reacted !== adding) {
        setReactions(applyReaction(prevReactions, emoji, data.reacted, currentUsername))
      }
    } catch {
      setReactions(prevReactions)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {reactions.map(r => (
        <div key={r.emoji} className="relative">
          <button
            onClick={() => {
              // A long-press only shows the names, it doesn't toggle
              if (longPressed.current) { longPressed.current = false; return }
              toggle(r.emoji)
            }}
            onMouseEnter={() => setTooltip(r.emoji)}
            onMouseLeave={() => setTooltip(null)}
            onTouchStart={() => startPress(r.emoji)}
            onTouchEnd={endPress}
            onTouchMove={endPress}
            onContextMenu={(e) => e.preventDefault()}
            onBlur={() => setTooltip(null)}
            disabled={loading === r.emoji}
            aria-pressed={r.userReacted}
            aria-label={`${r.emoji} ${r.count}${r.usernames.length ? ` — ${r.usernames.join(', ')}` : ''}`}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs border transition-colors select-none disabled:opacity-50 ${
              r.userReacted
                ? 'border-[#8b1a1a] bg-[#8b1a1a]/20 text-white'
                : 'border-[#2a2a2a] text-[#a0a0a0] hover:border-[#8a8a8a] hover:text-white'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
          </button>
          {tooltip === r.emoji && r.usernames.length > 0 && (
            <div role="tooltip" className="absolute bottom-full mb-1.5 left-0 z-50 bg-[#1e1e1e] border border-[#2a2a2a] px-2.5 py-1.5 text-[11px] text-[#c8c8c8] max-w-[70vw] whitespace-normal shadow-xl pointer-events-none">
              {r.usernames.join(', ')}
            </div>
          )}
        </div>
      ))}

      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => { setTooltip(null); setPickerOpen(!pickerOpen) }}
          title="Tepki ekle"
          aria-label="Tepki ekle"
          aria-expanded={pickerOpen}
          className="flex items-center px-2.5 py-1.5 border border-dashed border-[#2a2a2a] text-[#8a8a8a] hover:border-[#8a8a8a] hover:text-white transition-colors"
        >
          <Smile size={14} />
        </button>
        {pickerOpen && (
          <div role="menu" className="absolute bottom-full mb-1.5 left-0 z-50 bg-[#1e1e1e] border border-[#2a2a2a] p-1 flex gap-0.5 shadow-xl max-w-[calc(100vw-2rem)] overflow-x-auto">
            {QUICK_EMOJIS.map(e => (
              <button
                key={e}
                role="menuitem"
                onClick={() => toggle(e)}
                aria-label={e}
                className="text-lg hover:bg-[#2a2a2a] px-1.5 py-1 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
