## Done
- [x] Auth (signup, login, admin approval flow)
- [x] Sector-based forum with threaded replies (Reddit-style threading)
- [x] Admin panel (users, topics, sectors)
- [x] Real-time reply updates (Supabase Realtime)
- [x] Image uploads via Cloudinary
- [x] In-app notifications (unread tracking, bold unreads, bell icon)
- [x] Logo (favicon, topbar, login/signup pages)
- [x] User profiles (avatar upload, 8a.nu / 27crags / Instagram / YouTube links)
- [x] Search (topbar search icon, results page with keyword highlight)
- [x] Poll / grade voting (Font scale) — on topic creation AND inside replies via "Derece" button
- [x] Remove character limits (topics and replies)
- [x] Admin can preview pending/rejected topics without 404
- [x] Emoji picker in replies — Smile button, 80 emojis in 4 categories, inserts at cursor
- [x] GIF picker in replies — GIF button, Giphy API proxied server-side, 24 results grid
- [x] Refresh button on feed and sector pages (↻ icon beside heading, calls router.refresh())
- [x] Images in topic opening post — ImageUpload below Açıklama textarea
- [x] Logo as favicon — src/app/icon.png auto-detected by Next.js App Router

- [x] Topic count next to sector names in sidebar (approved topics per sector, quiet grey number)
- [x] Admin/user notifications — topic_pending, user_pending, reply_received, reply_to_post, mention_received
- [x] @mention highlighting in red in post content
- [x] GIF picker trending loads instantly on open (no typing required)
- [x] Admin topic auto-approval — admins bypass pending flow, redirect directly to their new topic
- [x] Tag system — optional chip-based Etiket selector (general tags + sector chips) on new topic
- [x] Live notification bell — Supabase Realtime subscription, bell lights up without page refresh
- [x] @mention autocomplete — type @ in reply box to search and tag users, inserts @username
- [x] Poll bar chart — all bars colored (red), user's own vote highlighted brighter
- [x] Send reply with only a GIF or image (no text required)

## NEXT

## FUTURE
- [ ] Email notifications via Resend — needs a verified domain
