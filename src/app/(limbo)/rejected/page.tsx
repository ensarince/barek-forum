import LogoutButton from '../LogoutButton'

export default function RejectedPage() {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="text-center max-w-sm">
        <div className="text-[#e05a4a] text-5xl mb-6" aria-hidden="true">✕</div>
        <h1 className="text-xl font-bold text-white uppercase tracking-widest mb-3">Üyelik Reddedildi</h1>
        <p className="text-[#8a8a8a] text-sm leading-relaxed">
          Üyelik başvurun onaylanmadı. Kader kısmet sıkma canını
        </p>
        <LogoutButton />
      </div>
    </div>
  )
}
