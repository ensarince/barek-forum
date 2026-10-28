'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cloudinaryThumb } from '@/lib/utils'
import { useDialog } from '@/lib/useDialog'
import type { Image as ImageRow } from '@/types/database'

interface PostImagesProps {
  images: ImageRow[]
}

export default function PostImages({ images }: PostImagesProps) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const lightboxRef = useDialog<HTMLDivElement>(lightbox !== null, () => setLightbox(null))

  if (!images.length) return null

  const visible = images.slice(0, 6)
  const extra = images.length - 6

  return (
    <>
      <div className="mt-3 ml-7 sm:ml-8 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {visible.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setLightbox(img.cloudinary_url)}
            aria-label={`Fotoğrafı büyüt (${i + 1}/${images.length})`}
            className="relative aspect-[4/3] overflow-hidden border border-[#2a2a2a] hover:border-[#8b1a1a] transition-colors group"
          >
            <img
              src={cloudinaryThumb(img.cloudinary_url)}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
            />
            {i === 5 && extra > 0 && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-sm font-semibold">
                +{extra} daha
              </div>
            )}
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label="Fotoğraf"
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2.5 bg-black/60 rounded-full text-white hover:bg-black/90 transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="Kapat"
          >
            <X size={22} />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
