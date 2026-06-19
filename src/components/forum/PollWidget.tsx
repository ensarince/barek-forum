'use client'

import { useState } from 'react'
import { GRADES } from '@/lib/grades'

interface PollWidgetProps {
  pollId: string
  question: string
  initialVotes: Record<string, number>
  initialUserVote: string | null
}

export default function PollWidget({ pollId, question, initialVotes, initialUserVote }: PollWidgetProps) {
  const [votes, setVotes] = useState<Record<string, number>>(initialVotes)
  const [userVote, setUserVote] = useState<string | null>(initialUserVote)
  const [loading, setLoading] = useState<string | null>(null)

  const total = Object.values(votes).reduce((a, b) => a + b, 0)

  async function castVote(grade: string) {
    if (loading) return
    setLoading(grade)
    try {
      const res = await fetch('/api/forum/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: pollId, grade }),
      })
      if (res.ok) {
        setVotes((prev) => {
          const next = { ...prev }
          if (userVote && next[userVote]) next[userVote] = Math.max(0, next[userVote] - 1)
          next[grade] = (next[grade] ?? 0) + 1
          return next
        })
        setUserVote(grade)
      }
    } finally {
      setLoading(null)
    }
  }

  const maxVotes = Math.max(...Object.values(votes), 1)

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b]">{question}</p>
        <span className="text-[11px] text-[#4a4a4a]">{total} oy</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mb-5">
        {GRADES.map((grade) => {
          const isVoted = userVote === grade
          const isLoading = loading === grade
          return (
            <button
              key={grade}
              onClick={() => castVote(grade)}
              disabled={!!loading}
              className={`py-1.5 text-xs font-bold tracking-wider border transition-colors disabled:cursor-wait ${
                isVoted
                  ? 'bg-[#8b1a1a] border-[#8b1a1a] text-white'
                  : 'bg-transparent border-[#2a2a2a] text-[#6b6b6b] hover:border-[#8b1a1a] hover:text-white'
              } ${isLoading ? 'opacity-50' : ''}`}
            >
              {grade}
            </button>
          )
        })}
      </div>

      {total > 0 && (
        <div className="space-y-1.5">
          {GRADES.filter((g) => (votes[g] ?? 0) > 0).map((grade) => {
            const count = votes[grade] ?? 0
            const pct = Math.round((count / total) * 100)
            const barWidth = Math.round((count / maxVotes) * 100)
            const isVoted = userVote === grade
            return (
              <div key={grade} className="flex items-center gap-2">
                <span className={`text-[11px] w-8 shrink-0 text-right font-bold ${isVoted ? 'text-[#c0392b]' : 'text-[#6b6b6b]'}`}>
                  {grade}
                </span>
                <div className="flex-1 h-4 bg-[#0d0d0d] border border-[#2a2a2a] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${isVoted ? 'bg-[#c0392b]' : 'bg-[#8b1a1a]'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#4a4a4a] w-12 shrink-0">
                  {count} ({pct}%)
                </span>
              </div>
            )
          })}
        </div>
      )}

      {userVote && (
        <p className="text-[11px] text-[#6b6b6b] mt-3">
          Oyun: <span className="text-[#c0392b] font-bold">{userVote}</span> — değiştirmek için başka dereceye tıkla
        </p>
      )}
    </div>
  )
}
