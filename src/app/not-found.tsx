import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="text-center max-w-sm">
        <p className="text-[#e05a4a] text-5xl font-bold mb-4" aria-hidden="true">404</p>
        <h1 className="text-sm font-semibold text-white uppercase tracking-widest mb-2">Sayfa bulunamadı</h1>
        <p className="text-[#8a8a8a] text-sm">Bu konu silinmiş ya da hiç var olmamış olabilir.</p>
        <Link
          href="/"
          className="inline-block mt-6 bg-[#8b1a1a] hover:bg-[#a82020] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors"
        >
          Ana Sayfa
        </Link>
      </div>
    </div>
  )
}
