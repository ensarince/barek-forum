export default function GizlilikPage() {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">Gizlilik Sözleşmesi</h1>
      <div className="bg-[#161616] border border-[#2a2a2a] p-6 space-y-4 text-sm text-[#c8c8c8] leading-relaxed">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Gizlilik Politikası</h2>
        <p>Bu forum, Barek Dağı bouldering topluluğuna özel, davetiye usulü çalışan özel bir platformdur. Üyelik yalnızca admin onayıyla verilir.</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">Toplanan Veriler</h3>
        <p>Kayıt sırasında yalnızca e-posta adresin ve seçtiğin kullanıcı adı kaydedilir. İsteğe bağlı olarak profil bağlantıları (8a.nu, 27crags, Instagram, YouTube) ekleyebilirsin.</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">Verilerin Kullanımı</h3>
        <p>E-posta adresin yalnızca hesap doğrulama ve parola sıfırlama amacıyla kullanılır. Forum içeriğin (konu başlıkları, yanıtlar, tepkiler) yalnızca forum üyeleriyle paylaşılır.</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">Veri Güvenliği</h3>
        <p>Veriler Supabase altyapısında saklanır ve şifrelenir. Üçüncü taraflarla paylaşılmaz.</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">Veri Silme</h3>
        <p>Hesabının silinmesini istiyorsan bir admin ile iletişime geç. Hesabın ve ilişkili veriler kaldırılacaktır.</p>

        <h3 className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4">İletişim</h3>
        <p>Gizlilik konusunda sorularınız için: <a href="mailto:fikretyaman95@gmail.com" className="text-[#c0392b] hover:underline">fikretyaman95@gmail.com</a></p>
      </div>
    </div>
  )
}
