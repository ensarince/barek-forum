'use client'

import { useEffect } from 'react'

/**
 * Supabase password-reset links can land on any page (often the Site URL, i.e. the home page)
 * with the tokens in the hash: #access_token=...&type=recovery. The hash never reaches the
 * server, so forward it to the reset form from the client — on every page, since guests can
 * now browse without being bounced to /login (which used to do this forwarding).
 */
export default function RecoveryRedirect() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/reset-password')) return
    const params = new URLSearchParams(window.location.hash.slice(1))
    const isRecovery = params.get('type') === 'recovery' && params.get('access_token')
    // An expired/used link comes back as #error=...&error_code=otp_expired — show the reset page's message
    const isRecoveryError = params.get('error_code') === 'otp_expired' || params.get('error') === 'access_denied'
    if (isRecovery || isRecoveryError) {
      window.location.replace(`/reset-password${window.location.hash}`)
    }
  }, [])
  return null
}
