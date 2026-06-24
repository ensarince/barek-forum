export default function RejectedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="text-center max-w-sm">
        <div className="text-[#c0392b] text-5xl mb-6">✕</div>
        <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-3">Üyelik Reddedildi</h2>
        <p className="text-[#6b6b6b] text-sm leading-relaxed">
          Üyelik başvurun onaylanmadı. Kader kısmet sıkma canını
        </p>
      </div>
    </div>
  )
}
