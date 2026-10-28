import LogoutButton from '../LogoutButton'

export default function PendingPage() {
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="text-center max-w-sm">
        <div className="text-[#e05a4a] text-5xl mb-6" aria-hidden="true">⧖</div>
        <h1 className="text-xl font-bold text-white uppercase tracking-widest mb-3">Onay Bekleniyor</h1>
        <p className="text-[#8a8a8a] text-sm leading-relaxed">
          Üyelik başvurun admin tarafından fena inceleniyor. Onaylandığında email ile bildirim alacaksın.
        </p>
        <LogoutButton />
      </div>
    </div>
  )
}
