'use client'

import { useEffect, useRef, useState } from 'react'
import { Smile } from 'lucide-react'
import type { ReactionGroup } from '@/types/database'

const QUICK_EMOJIS = ['❤️', '👍', '🔥', '💪', '😂', '👀', '😮', '🎯']

interface ReactionBarProps {
  targetId: string
  targetType: 'topic' | 'post'
  initialReactions: ReactionGroup[]
  currentUsername: string
}

export default function ReactionBar({ targetId, targetType, initialReactions, currentUsername }: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionGroup[]>(initialReactions)
  const [loading, setLoading] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    if (pickerOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  async function toggle(emoji: string) {
    if (loading) return
    setLoading(emoji)
    setPickerOpen(false)

    const existing = reactions.find(r => r.emoji === emoji)
    const removing = existing?.userReacted ?? false

    // Capture state for rollback
    const prevReactions = reactions

    // Optimistic update
    setReactions(prev => {
      if (removing) {
        const newCount = (existing?.count ?? 1) - 1
        if (newCount <= 0) return prev.filter(r => r.emoji !== emoji)
        return prev.map(r => r.emoji === emoji
          ? { ...r, count: newCount, userReacted: false, usernames: r.usernames.filter(u => u !== currentUsername) }
          : r)
      } else if (existing) {
        return prev.map(r => r.emoji === emoji
          ? { ...r, count: r.count + 1, userReacted: true, usernames: [...r.usernames, currentUsername] }
          : r)
      } else {
        return [...prev, { emoji, count: 1, usernames: [currentUsername], userReacted: true }]
      }
    })

    try {
      const body = targetType === 'topic'
        ? { emoji, topic_id: targetId }
        : { emoji, post_id: targetId }
      const res = await fetch('/api/forum/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) setReactions(prevReactions)
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
            onClick={() => toggle(r.emoji)}
            onMouseEnter={() => setTooltip(r.emoji)}
            onMouseLeave={() => setTooltip(null)}
            disabled={loading === r.emoji}
            className={`flex items-center gap-1 px-2 py-0.5 text-xs border transition-colors disabled:opacity-50 ${
              r.userReacted
                ? 'border-[#8b1a1a] bg-[#8b1a1a]/20 text-white'
                : 'border-[#2a2a2a] text-[#a0a0a0] hover:border-[#4a4a4a] hover:text-white'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
          </button>
          {tooltip === r.emoji && r.usernames.length > 0 && (
            <div className="absolute bottom-full mb-1.5 left-0 z-50 bg-[#1e1e1e] border border-[#2a2a2a] px-2.5 py-1.5 text-[10px] text-[#c8c8c8] whitespace-nowrap shadow-xl pointer-events-none">
              {r.usernames.join(', ')}
            </div>
          )}
        </div>
      ))}

      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          title="Tepki ekle"
          className="flex items-center px-1.5 py-0.5 border border-dashed border-[#2a2a2a] text-[#4a4a4a] hover:border-[#6b6b6b] hover:text-[#a0a0a0] transition-colors"
        >
          <Smile size={12} />
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full mb-1.5 left-0 z-50 bg-[#1e1e1e] border border-[#2a2a2a] p-1.5 flex gap-0.5 shadow-xl">
            {QUICK_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => toggle(e)}
                className="text-base hover:bg-[#2a2a2a] px-1 py-0.5 transition-colors"
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
