import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = 'BBUnGUHYPFTJSSFz1HpavEaksNsc8RcAKMhS8XJzvXEYgENZ3l_DNDCNM7R1UCBTXchUFw-0317ZPFhrXtEehp0'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:info@vektor.training'

function base64urlToUint8Array(base64: string): Uint8Array {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return Uint8Array.from([...bin].map(c => c.charCodeAt(0)))
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeJWT(sub: string, aud: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { aud, exp: now + 12 * 3600, sub }

  const enc = new TextEncoder()
  const toSign = `${uint8ArrayToBase64url(enc.encode(JSON.stringify(header)))}.${uint8ArrayToBase64url(enc.encode(JSON.stringify(payload)))}`

  const privKeyBytes = base64urlToUint8Array(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', privKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    enc.encode(toSign)
  )
  return `${toSign}.${uint8ArrayToBase64url(new Uint8Array(sig))}`
}

async function sendPush(subscription: any, payload: object): Promise<boolean> {
  const endpoint: string = subscription.endpoint
  const origin = new URL(endpoint).origin

  const jwt = await makeJWT(VAPID_SUBJECT, origin)
  const authHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`

  const body = new TextEncoder().encode(JSON.stringify(payload))

  // Simple unencrypted push (body as plaintext for simplicity)
  // For encrypted push we'd need ECDH — use raw endpoint with Content-Encoding: aes128gcm
  // For now send as application/octet-stream
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body,
  })

  return res.ok || res.status === 201
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { user_id, title, body, url } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)

    if (!subs?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    let sent = 0
    for (const row of subs) {
      const ok = await sendPush(row.subscription, { title, body, url })
      if (ok) sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
