// Best-effort in-memory rate limiter.
// On Vercel serverless each instance has its own store — this protects against
// rapid sequential bursts from the same client hitting the same instance.

const store = new Map<string, { count: number; resetAt: number }>()

/** Returns true if the request is allowed, false if it should be blocked. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}
