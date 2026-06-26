import { Resend } from 'resend'
import { createServiceClient } from './supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'Barek Forum <noreply@barekforum.com>'
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')

// ─── HTML shell ───────────────────────────────────────────────────────────────

function shell(body: string) {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;background:#111111;border:1px solid #222222;">
        <tr>
          <td style="padding:20px 32px;border-bottom:1px solid #1e1e1e;">
            <span style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#c0392b;font-weight:bold;">BAREK BOULDERING FORUM</span>
          </td>
        </tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #1a1a1a;">
            <p style="margin:0;font-size:11px;color:#3a3a3a;line-height:1.5;">
              Bu e-postayı almak istemiyorsan <a href="mailto:fikretyaman95@gmail.com" style="color:#4a4a4a;">fikretyaman95@gmail.com</a> adresine yazabilirsin.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function p(content: string, color = '#a0a0a0') {
  return `<p style="margin:0 0 16px;font-size:14px;color:${color};line-height:1.7;">${content}</p>`
}

function btn(href: string, label: string) {
  return `<p style="margin:24px 0 0;"><a href="${href}" style="display:inline-block;padding:11px 28px;background:#8b1a1a;color:#ffffff;text-decoration:none;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;">${label}</a></p>`
}

function quote(text: string) {
  return `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #8b1a1a;background:#161616;font-size:13px;color:#c8c8c8;font-style:italic;">${text}</p>`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const service = createServiceClient()
    const { data } = await service.auth.admin.getUserById(userId)
    return data.user?.email ?? null
  } catch {
    return null
  }
}

// BUG 6 FIX: single listUsers() call instead of N getUserById calls
async function getUserEmails(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return []
  try {
    const service = createServiceClient()
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
    const idSet = new Set(userIds)
    return (data?.users ?? [])
      .filter((u) => idSet.has(u.id) && !!u.email)
      .map((u) => u.email!)
  } catch {
    return []
  }
}

async function send(to: string | string[], subject: string, body: string) {
  if (!process.env.RESEND_API_KEY) return // silently skip in dev if not configured
  try {
    await resend.emails.send({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html: shell(body) })
  } catch (e) {
    console.error('[email] send failed:', subject, e)
  }
}

async function sendBcc(bcc: string[], subject: string, body: string) {
  if (!process.env.RESEND_API_KEY || !bcc.length) return
  try {
    // BUG 3 FIX: extract plain email from "Name <email>" display format
    const toAddr = FROM.replace(/.*<(.+)>.*/, '$1')
    await resend.emails.send({ from: FROM, to: [toAddr], bcc, subject, html: shell(body) })
  } catch (e) {
    console.error('[email] bcc send failed:', subject, e)
  }
}

// ─── Email types ──────────────────────────────────────────────────────────────

/** Admin: a new user has signed up and is awaiting approval */
export async function emailAdminsNewUser(adminIds: string[], newUsername: string, newUserEmail: string) {
  const adminEmails = await getUserEmails(adminIds)
  if (!adminEmails.length) return
  await send(adminEmails, `Yeni üyelik başvurusu — ${newUsername}`, `
    ${p('Yeni bir üyelik başvurusu var:', '#e8e8e8')}
    ${p(`<strong style="color:#fff">${newUsername}</strong> &lt;${newUserEmail}&gt;`)}
    ${p('Admin panelinden başvuruyu inceleyip onaylayabilirsin.')}
    ${btn(`${SITE}/admin/users`, 'Başvuruyu İncele')}
  `)
}

/** User: their account was approved */
export async function emailUserApproved(userId: string, username: string) {
  const email = await getUserEmail(userId)
  if (!email) return
  await send(email, 'Üyeliğin onaylandı — Barek Forum', `
    ${p(`Merhaba <strong style="color:#fff">${username}</strong>,`, '#e8e8e8')}
    ${p('Üyelik başvurun onaylandı. Artık foruma giriş yapabilirsin.')}
    ${btn(`${SITE}/login`, 'Foruma Gir')}
  `)
}

/** User: their account was rejected */
export async function emailUserRejected(userId: string, username: string) {
  const email = await getUserEmail(userId)
  if (!email) return
  await send(email, 'Üyelik başvurun hakkında — Barek Forum', `
    ${p(`Merhaba <strong style="color:#fff">${username}</strong>,`, '#e8e8e8')}
    ${p('Üyelik başvurun bu sefer onaylanmadı.')}
    ${p('Sorularınız için <a href="mailto:fikretyaman95@gmail.com" style="color:#c0392b;">fikretyaman95@gmail.com</a> adresine yazabilirsin.')}
  `)
}

/** Admin: a new topic is awaiting approval */
export async function emailAdminsNewTopic(adminIds: string[], authorUsername: string, topicTitle: string) {
  const adminEmails = await getUserEmails(adminIds)
  if (!adminEmails.length) return
  await send(adminEmails, `Yeni konu onay bekliyor — ${authorUsername}`, `
    ${p(`<strong style="color:#fff">${authorUsername}</strong> yeni bir konu paylaştı:`, '#e8e8e8')}
    ${quote(topicTitle)}
    ${p('Admin panelinden inceleyip onaylayabilirsin.')}
    ${btn(`${SITE}/admin/topics`, 'Konuyu İncele')}
  `)
}

/** User: their topic was approved */
export async function emailUserTopicApproved(userId: string, username: string, topicTitle: string, topicId: string) {
  const email = await getUserEmail(userId)
  if (!email) return
  await send(email, `Konun onaylandı — Barek Forum`, `
    ${p(`Merhaba <strong style="color:#fff">${username}</strong>,`, '#e8e8e8')}
    ${p('Aşağıdaki konun onaylandı ve forumda yayınlandı:')}
    ${quote(topicTitle)}
    ${btn(`${SITE}/topics/${topicId}`, 'Konuya Git')}
  `)
}

/** User: their topic was rejected */
export async function emailUserTopicRejected(userId: string, username: string, topicTitle: string) {
  const email = await getUserEmail(userId)
  if (!email) return
  await send(email, 'Konu başvurun hakkında — Barek Forum', `
    ${p(`Merhaba <strong style="color:#fff">${username}</strong>,`, '#e8e8e8')}
    ${p('Aşağıdaki konu bu sefer onaylanmadı:')}
    ${quote(topicTitle)}
    ${p('Sorularınız için <a href="mailto:fikretyaman95@gmail.com" style="color:#c0392b;">fikretyaman95@gmail.com</a> adresine yazabilirsin.')}
  `)
}

/** User: someone replied to their topic */
export async function emailUserNewReply(userId: string, username: string, replierUsername: string, topicTitle: string, topicId: string) {
  const email = await getUserEmail(userId)
  if (!email) return
  await send(email, `Konuna yeni yanıt — ${replierUsername}`, `
    ${p(`Merhaba <strong style="color:#fff">${username}</strong>,`, '#e8e8e8')}
    ${p(`<strong style="color:#fff">${replierUsername}</strong> konuna yanıt verdi:`)}
    ${quote(topicTitle)}
    ${btn(`${SITE}/topics/${topicId}`, 'Yanıtı Gör')}
  `)
}

/** User: they were @mentioned in a post */
export async function emailUserMentioned(userId: string, username: string, mentionerUsername: string, topicTitle: string, topicId: string) {
  const email = await getUserEmail(userId)
  if (!email) return
  await send(email, `${mentionerUsername} seni etiketledi`, `
    ${p(`Merhaba <strong style="color:#fff">${username}</strong>,`, '#e8e8e8')}
    ${p(`<strong style="color:#fff">${mentionerUsername}</strong> bir konuda seni etiketledi:`)}
    ${quote(topicTitle)}
    ${btn(`${SITE}/topics/${topicId}`, 'Konuya Git')}
  `)
}

/** User: password reset link */
export async function emailPasswordReset(toEmail: string, resetLink: string) {
  if (!process.env.RESEND_API_KEY) return
  try {
    await resend.emails.send({
      from: FROM,
      to: [toEmail],
      subject: 'Şifre sıfırlama — Barek Forum',
      html: shell(`
        ${p('Şifreni sıfırlamak için aşağıdaki butona tıkla:', '#e8e8e8')}
        ${btn(resetLink, 'Şifremi Sıfırla')}
        ${p('Bu bağlantı 1 saat geçerlidir. Eğer bu isteği sen yapmadıysan bu emaili görmezden gelebilirsin.')}
      `),
    })
  } catch (e) {
    console.error('[email] password reset failed:', e)
  }
}

/** Admin: a user submitted a bug report */
export async function emailAdminBugReport(adminIds: string[], reporterUsername: string, description: string, pageUrl: string) {
  const adminEmails = await getUserEmails(adminIds)
  if (!adminEmails.length) return
  await send(adminEmails, `Hata raporu — ${reporterUsername}`, `
    ${p(`<strong style="color:#fff">${reporterUsername}</strong> bir hata bildirdi:`, '#e8e8e8')}
    ${quote(description)}
    ${pageUrl ? p(`Sayfa: <code style="color:#c8c8c8;background:#1a1a1a;padding:2px 6px;font-size:12px;">${pageUrl}</code>`) : ''}
    ${btn(`${SITE}/admin/bug-reports`, 'Raporları Gör')}
  `)
}

/** All approved users: a new announcement was posted */
export async function emailAllUsersAnnouncement(userIds: string[], announcementTitle: string, topicId: string) {
  const emails = await getUserEmails(userIds)
  if (!emails.length) return
  // BCC so recipients don't see each other
  await sendBcc(emails, `Yeni duyuru: ${announcementTitle}`, `
    ${p('Barek Bouldering Forum\'dan yeni bir duyuru:', '#e8e8e8')}
    ${quote(announcementTitle)}
    ${btn(`${SITE}/topics/${topicId}`, 'Duyuruyu Oku')}
  `)
}
