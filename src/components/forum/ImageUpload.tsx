'use client'

import { useRef, useState } from 'react'
import { X, Paperclip } from 'lucide-react'

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void
  maxImages?: number
}

export default function ImageUpload({ onImagesChange, maxImages = 5 }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const merged = [...files, ...selected].slice(0, maxImages)
    setFiles(merged)
    setPreviews(merged.map((f) => URL.createObjectURL(f)))
    onImagesChange(merged)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(index: number) {
    URL.revokeObjectURL(previews[index])
    const next = files.filter((_, i) => i !== index)
    const nextPreviews = previews.filter((_, i) => i !== index)
    setFiles(next)
    setPreviews(nextPreviews)
    onImagesChange(next)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {files.length < maxImages && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 border border-[#2a2a2a] text-[#6b6b6b] hover:text-white hover:border-[#8b1a1a] px-3 py-1.5 text-xs uppercase tracking-wider transition-colors"
        >
          <Paperclip size={12} />
          Fotoğraf Ekle
        </button>
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
        <div key={i} className="relative w-16 h-16 shrink-0">
          <img src={src} alt="" className="w-full h-full object-cover border border-[#2a2a2a]" />
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#8b1a1a] text-white flex items-center justify-center text-[10px] leading-none hover:bg-[#c0392b] transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  )
}
