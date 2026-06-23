export default function ImpressumPage() {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Impressum</h1>
      <div className="bg-[#161616] border border-[#2a2a2a] p-6 space-y-4 text-sm text-[#c8c8c8] leading-relaxed">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Künye</h2>
        <p>Bu platform, Barek Dağı bouldering topluluğu tarafından işletilen özel bir forumudur.</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">Platform</h3>
        <p>Barek Bouldering Forum</p>
        <p>Kırıkkale, Türkiye</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">İçerik Sorumluluğu</h3>
        <p>Forum içerikleri üyeler tarafından oluşturulmaktadır. Platform, üyeler tarafından paylaşılan içeriklerden sorumlu değildir.</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">Sorumluluk Reddi</h3>
        <p>Tırmanma doğası gereği riskli bir aktivitedir. Bu forumda paylaşılan güzergah bilgileri, koşul raporları ve tavsiyeler bilgilendirme amaçlıdır. Her tırmanıcı kendi güvenliğinden sorumludur.</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">İletişim</h3>
        <p>Forum yönetimiyle iletişim: <a href="mailto:fikretyaman95@gmail.com" className="text-[#c0392b] hover:underline">fikretyaman95@gmail.com</a></p>
      </div>
    </div>
  )
}
