'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export default function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  function handleRefresh() {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 700)
  }

  return (
    <button
      onClick={handleRefresh}
      title="Yenile"
      className="p-2 text-[#8a8a8a] hover:text-white transition-colors"
    >
      <RefreshCw size={14} className={spinning ? 'animate-spin' : ''} />
    </button>
  )
}
