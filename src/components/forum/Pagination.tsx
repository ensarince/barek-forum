import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  /** Path the page param is added to, e.g. "/" or "/sectors/123" */
  basePath: string
}

function pageHref(basePath: string, page: number) {
  return page <= 1 ? basePath : `${basePath}?sayfa=${page}`
}

export default function Pagination({ page, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null

  const linkCls = 'flex items-center gap-1 px-3 py-2.5 text-xs uppercase tracking-widest border border-[#2a2a2a] text-[#c8c8c8] hover:text-white hover:border-[#8b1a1a] transition-colors'
  const disabledCls = 'flex items-center gap-1 px-3 py-2.5 text-xs uppercase tracking-widest border border-[#1e1e1e] text-[#4a4a4a]'

  return (
    <nav aria-label="Sayfalar" className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-[#2a2a2a]">
      {page > 1 ? (
        <Link href={pageHref(basePath, page - 1)} className={linkCls} rel="prev">
          <ChevronLeft size={14} /> Önceki
        </Link>
      ) : (
        <span className={disabledCls} aria-hidden="true"><ChevronLeft size={14} /> Önceki</span>
      )}

      <span className="text-xs text-[#8a8a8a]" aria-current="page">
        Sayfa {page} / {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={pageHref(basePath, page + 1)} className={linkCls} rel="next">
          Sonraki <ChevronRight size={14} />
        </Link>
      ) : (
        <span className={disabledCls} aria-hidden="true">Sonraki <ChevronRight size={14} /></span>
      )}
    </nav>
  )
}
