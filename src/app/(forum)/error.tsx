'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'

export default function ForumError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center" role="alert">
      <h1 className="text-sm font-semibold text-white uppercase tracking-widest mb-2">Bir şeyler ters gitti</h1>
      <p className="text-[#8a8a8a] text-sm">Sayfa yüklenemedi. Bağlantın zayıf olabilir.</p>
      <button
        onClick={() => unstable_retry()}
        className="mt-6 bg-[#8b1a1a] hover:bg-[#a82020] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors"
      >
        Tekrar Dene
      </button>
    </div>
  )
}
