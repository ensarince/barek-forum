// Pending/rejected users have no other way out — the proxy keeps sending them back here
export default function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST" className="mt-8">
      <button
        type="submit"
        className="text-xs uppercase tracking-widest text-[#8a8a8a] hover:text-white border border-[#2a2a2a] hover:border-[#8a8a8a] px-5 py-2.5 transition-colors"
      >
        Çıkış Yap
      </button>
    </form>
  )
}
