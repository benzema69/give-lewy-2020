const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!.replace(/\/$/, '')
const SECRET_KEYS = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const DB_KEY = SECRET_KEYS.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const DEFAULT_SITE = 'https://give-lewy-2020.vercel.app'
const SESSION_COOKIE = 'give_lewy_session'

let cachedSalt: string | null = null

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allow = origin === DEFAULT_SITE || /^https:\/\/give-lewy-2020(?:-[a-z0-9-]+)?(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin)
    ? origin
    : DEFAULT_SITE
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'content-type, x-client-ip, x-site-origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(req), ...extra },
  })
}

async function db(path: string, init: RequestInit = {}) {
  if (!DB_KEY) throw new Error('Missing Supabase secret key')
  const headers = new Headers(init.headers || {})
  headers.set('apikey', DB_KEY)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers, cache: 'no-store' })
}

async function getSalt() {
  if (cachedSalt) return cachedSalt
  const r = await db('petition_internal?id=eq.global&select=hmac_salt&limit=1')
  if (!r.ok) throw new Error(`salt lookup failed ${r.status}`)
  const rows = await r.json()
  if (!rows?.[0]?.hmac_salt) throw new Error('salt missing')
  cachedSalt = String(rows[0].hmac_salt)
  return cachedSalt
}

function utf8(v: string) { return new TextEncoder().encode(v) }
function hex(buf: ArrayBuffer) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('') }

async function sha256(value: string) {
  return hex(await crypto.subtle.digest('SHA-256', utf8(value)))
}

async function hmac(label: string, value: string | null) {
  if (!value) return null
  const salt = await getSalt()
  const key = await crypto.subtle.importKey('raw', utf8(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, utf8(`${label}:${value}`)))
}

function normalizeEmail(v: unknown) { return String(v || '').trim().toLowerCase() }
function validEmail(v: string) { return !v || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254) }
function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
function utcDay() { return new Date().toISOString().slice(0, 10) }
function parseCookies(req: Request) {
  const raw = req.headers.get('cookie') || ''
  const out: Record<string,string> = {}
  for (const pair of raw.split(';')) {
    const i = pair.indexOf('=')
    if (i < 0) continue
    const k = pair.slice(0, i).trim()
    const v = pair.slice(i + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}
function sessionCookie(value: string, maxAge = 60 * 60 * 24 * 180) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}
function getOrCreateSession(req: Request) {
  const cookies = parseCookies(req)
  let id = cookies[SESSION_COOKIE]
  let setCookie: string | null = null
  if (!id || id.length < 20 || id.length > 200) {
    id = crypto.randomUUID()
    setCookie = sessionCookie(id)
  }
  return { id, setCookie }
}
function getClientIp(req: Request) {
  const proxied = req.headers.get('x-client-ip')
  if (proxied) return proxied.split(',')[0].trim() || null
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || null
}
function siteOrigin(req: Request) {
  const v = req.headers.get('x-site-origin') || ''
  if (v === DEFAULT_SITE || /^https:\/\/give-lewy-2020(?:-[a-z0-9-]+)?(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(v)) return v.replace(/\/$/, '')
  return DEFAULT_SITE
}

async function countRows(query: string) {
  const r = await db(query, { headers: { Prefer: 'count=exact', Range: '0-0' } })
  if (!r.ok) return 0
  const cr = r.headers.get('content-range') || '0/0'
  return Number(cr.split('/')[1] || 0)
}

async function sendMail(to: string, verifyUrl: string, deleteUrl: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('PETITION_FROM_EMAIL')
  if (!key || !from) return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Confirme ton e-mail — Give Lewy 2020',
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px"><h1>Renforce ta signature</h1><p>Ta signature a bien été reçue. Confirme ton e-mail pour renforcer sa fiabilité.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#d5ad50;color:#171104;text-decoration:none;font-weight:700;padding:14px 18px;border-radius:10px">Confirmer mon e-mail</a></p><p style="font-size:13px;color:#666">Suppression : <a href="${deleteUrl}">supprimer ma signature</a>.</p></div>`,
    }),
  })
  return r.ok
}

async function handleCount(req: Request) {
  const r = await db('petition_stats?id=eq.global&select=accepted_count,email_verified_count&limit=1')
  if (!r.ok) throw new Error(`count ${r.status}`)
  const rows = await r.json()
  const row = rows[0] || {}
  return json(req, { count: Number(row.accepted_count || 0), emailVerified: Number(row.email_verified_count || 0) }, 200, {
    'Cache-Control': 'public, max-age=5, stale-while-revalidate=30',
  })
}

async function handleConfig(req: Request) {
  return json(req, { turnstileSiteKey: Deno.env.get('TURNSTILE_SITE_KEY') || null }, 200, { 'Cache-Control': 'public, max-age=300' })
}

async function handleSign(req: Request) {
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  let b: any = {}
  try { b = await req.json() } catch { b = {} }
  if (b.website) return json(req, { ok: true, status: 'accepted' })

  const name = String(b.name || '').trim()
  const mail = normalizeEmail(b.email)
  const country = String(b.country || '').trim()
  const publicName = !!b.publicName && !!name
  const updatesOptIn = !!b.updatesOptIn && !!mail
  if (name.length > 80) return json(req, { error: 'Nom trop long.' }, 400)
  if (!validEmail(mail)) return json(req, { error: 'E-mail invalide.' }, 400)
  if (country.length > 80) return json(req, { error: 'Pays invalide.' }, 400)

  const { id: sessionId, setCookie } = getOrCreateSession(req)
  const sessionHash = await hmac('session', sessionId)
  const ip = getClientIp(req)
  const ipHash = await hmac(`ip:${utcDay()}`, ip)
  const uaHash = await hmac('ua', req.headers.get('user-agent') || '')

  const sr = await db(`signatures?session_hash=eq.${encodeURIComponent(sessionHash || '')}&status=in.(accepted,pending)&select=id,status&limit=1`)
  if (!sr.ok) throw new Error(`session lookup ${sr.status}`)
  const sessionRows = await sr.json()
  if (sessionRows.length) return json(req, { error: 'Cette session a déjà signé la pétition.', code: 'already_signed' }, 409, setCookie ? { 'Set-Cookie': setCookie } : {})

  if (mail) {
    const er = await db(`signatures?email=eq.${encodeURIComponent(mail)}&status=in.(accepted,pending)&select=id,status&limit=1`)
    if (!er.ok) throw new Error(`email lookup ${er.status}`)
    const rows = await er.json()
    if (rows.length) return json(req, { error: 'Cet e-mail est déjà associé à une signature.', code: 'email_duplicate' }, 409, setCookie ? { 'Set-Cookie': setCookie } : {})
  }

  const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const sinceTenMin = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const [ipHour, ipTen, ipUaTen] = await Promise.all([
    ipHash ? countRows(`signatures?ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(sinceHour)}&select=id`) : 0,
    ipHash ? countRows(`signatures?ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(sinceTenMin)}&select=id`) : 0,
    ipHash && uaHash ? countRows(`signatures?ip_hash=eq.${encodeURIComponent(ipHash)}&user_agent_hash=eq.${encodeURIComponent(uaHash)}&created_at=gte.${encodeURIComponent(sinceTenMin)}&select=id`) : 0,
  ])

  let risk = 0
  if (ipTen >= 20 || ipHour >= 50) risk += 100
  else if (ipTen >= 10 || ipHour >= 25) risk += 70
  else if (ipTen >= 5 || ipHour >= 12) risk += 40
  else if (ipHour >= 6) risk += 20
  if (ipUaTen >= 5) risk += 30
  if (!mail && !name && !country) risk += 8
  if (mail) risk -= 15
  if (name) risk -= 3
  if (country) risk -= 2
  risk = Math.max(0, Math.min(100, risk))

  if (risk >= 90) return json(req, { error: 'Cette tentative ressemble à du trafic automatisé. Réessaie plus tard.', code: 'risk_rejected' }, 429, setCookie ? { 'Set-Cookie': setCookie } : {})

  const status = risk >= 50 ? 'pending' : 'accepted'
  const verifyRaw = mail ? token() : null
  const deleteRaw = token()
  const now = new Date().toISOString()
  const rec = {
    id: crypto.randomUUID(),
    name: name || null,
    email: mail || null,
    country: country || null,
    public_name: publicName,
    updates_opt_in: updatesOptIn,
    status,
    risk_score: risk,
    email_verified_at: null,
    verify_token_hash: verifyRaw ? await sha256(verifyRaw) : null,
    delete_token_hash: await sha256(deleteRaw),
    session_hash: sessionHash,
    ip_hash: ipHash,
    user_agent_hash: uaHash,
    created_at: now,
    accepted_at: status === 'accepted' ? now : null,
  }
  const wr = await db('signatures', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rec) })
  if (!wr.ok) throw new Error(`write failed ${wr.status} ${await wr.text()}`)

  let verification = 'not_provided'
  if (mail && verifyRaw) {
    const base = siteOrigin(req)
    const sent = await sendMail(mail, `${base}/api/verify?token=${encodeURIComponent(verifyRaw)}`, `${base}/api/delete?token=${encodeURIComponent(deleteRaw)}`)
    verification = sent ? 'sent' : 'unavailable'
  }

  return json(req, { ok: true, status, accepted: status === 'accepted', emailVerification: verification }, 200, setCookie ? { 'Set-Cookie': setCookie } : {})
}

async function handleVerify(req: Request, url: URL) {
  const base = siteOrigin(req)
  const raw = url.searchParams.get('token') || ''
  if (!raw) return Response.redirect(`${base}/merci?status=invalid`, 302)
  const h = await sha256(raw)
  const lr = await db(`signatures?verify_token_hash=eq.${encodeURIComponent(h)}&select=id,status,risk_score&limit=1`)
  if (!lr.ok) throw new Error(`verify lookup ${lr.status}`)
  const rows = await lr.json()
  if (!rows.length) return Response.redirect(`${base}/merci?status=invalid`, 302)
  const row = rows[0]
  const now = new Date().toISOString()
  const patch: Record<string,unknown> = { email_verified_at: now }
  if (row.status === 'pending' && Number(row.risk_score || 0) < 90) {
    patch.status = 'accepted'
    patch.accepted_at = now
  }
  const ur = await db(`signatures?id=eq.${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) })
  if (!ur.ok) throw new Error(`verify update ${ur.status}`)
  return Response.redirect(`${base}/merci?status=ok`, 302)
}

async function handleDeleteToken(req: Request, url: URL) {
  const base = siteOrigin(req)
  const raw = url.searchParams.get('token') || ''
  if (!raw) return Response.redirect(`${base}/?deleted=invalid`, 302)
  const h = await sha256(raw)
  const r = await db(`signatures?delete_token_hash=eq.${encodeURIComponent(h)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
  if (!r.ok) throw new Error(`delete token ${r.status}`)
  return Response.redirect(`${base}/?deleted=1`, 302)
}

async function handleDeleteSession(req: Request) {
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  const id = parseCookies(req)[SESSION_COOKIE]
  if (!id) return json(req, { ok: true, deleted: 0 }, 200, { 'Set-Cookie': sessionCookie('', 0) })
  const sh = await hmac('session', id)
  const r = await db(`signatures?session_hash=eq.${encodeURIComponent(sh || '')}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } })
  if (!r.ok) throw new Error(`delete session ${r.status}`)
  const rows = await r.json().catch(() => [])
  return json(req, { ok: true, deleted: Array.isArray(rows) ? rows.length : 0 }, 200, { 'Set-Cookie': sessionCookie('', 0) })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'count'
    if (action === 'count') return await handleCount(req)
    if (action === 'config') return await handleConfig(req)
    if (action === 'sign') return await handleSign(req)
    if (action === 'verify') return await handleVerify(req, url)
    if (action === 'delete') return await handleDeleteToken(req, url)
    if (action === 'delete-session') return await handleDeleteSession(req)
    return json(req, { error: 'Not found' }, 404)
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    return json(req, { error: 'Service temporairement indisponible.' }, 500)
  }
})
