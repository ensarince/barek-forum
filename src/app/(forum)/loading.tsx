// Skeleton list shown while a forum page loads (slow mobile connections otherwise show nothing)
export default function ForumLoading() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yükleniyor...</span>
      <div className="h-3 w-32 bg-[#1e1e1e] mb-6 animate-pulse" />
      <div className="divide-y divide-[#2a2a2a]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="py-4 space-y-2 animate-pulse">
            <div className="h-3 w-16 bg-[#1e1e1e]" />
            <div className="h-4 w-3/4 bg-[#1e1e1e]" />
            <div className="h-3 w-40 bg-[#161616]" />
          </div>
        ))}
      </div>
    </div>
  )
}
