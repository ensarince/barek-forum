// Rate limiter backed by Upstash Redis (shared across all Vercel instances).
// Env: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or the KV_REST_API_* names the Vercel integration sets).
// Without them, or if Redis is unreachable, it falls back to a per-instance in-memory limiter.

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)?.trim()
const REDIS_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)?.trim()

const store = new Map<string, { count: number; resetAt: number }>()

function memoryRateLimit(key: string, limit: number, windowMs: number): boolean {
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

/** Returns true if the request is allowed, false if it should be blocked. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!REDIS_URL || !REDIS_TOKEN) return memoryRateLimit(key, limit, windowMs)

  try {
    // Fixed window: INCR the counter, set its expiry only when the window starts
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify([
        ['INCR', `rl:${key}`],
        ['PEXPIRE', `rl:${key}`, String(windowMs), 'NX'],
      ]),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`upstash ${res.status}`)
    const [incr] = await res.json() as { result?: number; error?: string }[]
    if (typeof incr?.result !== 'number') throw new Error(incr?.error ?? 'upstash: bad response')
    return incr.result <= limit
  } catch (err) {
    console.error('[rateLimit] redis failed, using memory fallback:', err)
    return memoryRateLimit(key, limit, windowMs)
  }
}
