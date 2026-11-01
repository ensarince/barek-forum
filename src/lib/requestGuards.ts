// Small guards shared by the cookie-setting auth routes.

/** Client IP as seen by Vercel (x-real-ip is set by the platform; x-forwarded-for as fallback). */
export function clientIp(request: Request): string {
  return request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'
}

/**
 * Rejects cross-site form posts (login CSRF): the request must be JSON and, when the browser
 * sends an Origin header, it must be our own origin.
 */
export function isSameOriginJson(request: Request): boolean {
  if (!request.headers.get('content-type')?.includes('application/json')) return false
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}
