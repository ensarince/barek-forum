'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Paperclip } from 'lucide-react'
import { compressImage, MAX_UPLOAD_BYTES } from '@/lib/compressImage'

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void
  maxImages?: number
}

// Remount (change its `key`) to clear it after a successful submit
export default function ImageUpload({ onImagesChange, maxImages = 5 }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewsRef = useRef<string[]>([])

  // Free preview object URLs when the component goes away
  useEffect(() => { previewsRef.current = previews }, [previews])
  useEffect(() => () => previewsRef.current.forEach((u) => URL.revokeObjectURL(u)), [])

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).slice(0, Math.max(0, maxImages - files.length))
    if (inputRef.current) inputRef.current.value = ''
    if (selected.length === 0) return

    setProcessing(true)
    const compressed = await Promise.all(selected.map(compressImage))
    setProcessing(false)

    const oversized = compressed.filter((f) => f.size > MAX_UPLOAD_BYTES)
    setSizeError(oversized.length > 0 ? `"${oversized[0].name}" çok büyük (max 4 MB).` : null)
    const valid = compressed.filter((f) => f.size <= MAX_UPLOAD_BYTES)

    const merged = [...files, ...valid].slice(0, maxImages)
    const newPreviews = valid.slice(0, merged.length - files.length).map((f) => URL.createObjectURL(f))
    setFiles(merged)
    setPreviews([...previews, ...newPreviews])
    onImagesChange(merged)
  }

  function remove(index: number) {
    URL.revokeObjectURL(previews[index])
    const next = files.filter((_, i) => i !== index)
    const nextPreviews = previews.filter((_, i) => i !== index)
    setFiles(next)
    setPreviews(nextPreviews)
    onImagesChange(next)
    setSizeError(null)
  }

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {files.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processing}
            className="flex items-center gap-1.5 border border-[#2a2a2a] text-[#8a8a8a] hover:text-white hover:border-[#8b1a1a] px-3 py-2 text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            <Paperclip size={12} />
            {processing ? 'Hazırlanıyor...' : 'Fotoğraf Ekle'}
          </button>
        )}
        {files.length > 0 && (
          <span className="text-[#8a8a8a] text-[11px]">{files.length}/{maxImages}</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleSelect}
        />
        {previews.map((src, i) => (
          <div key={src} className="relative w-16 h-16 shrink-0">
            <img src={src} alt="" className="w-full h-full object-cover border border-[#2a2a2a]" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Fotoğrafı kaldır"
              className="absolute -top-2.5 -right-2.5 w-7 h-7 flex items-center justify-center"
            >
              <span className="w-5 h-5 bg-[#8b1a1a] text-white flex items-center justify-center hover:bg-[#c0392b] transition-colors">
                <X size={12} />
              </span>
            </button>
          </div>
        ))}
      </div>
      {sizeError ? (
        <p role="alert" className="text-[#e05a4a] text-[11px] mt-1">{sizeError}</p>
      ) : (
        <p className="text-[#8a8a8a] text-[11px] mt-1">Maks. {maxImages} fotoğraf/GIF</p>
      )}
    </div>
  )
}
