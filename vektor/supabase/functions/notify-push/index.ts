import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY  = 'BBUnGUHYPFTJSSFz1HpavEaksNsc8RcAKMhS8XJzvXEYgENZ3l_DNDCNM7R1UCBTXchUFw-0317ZPFhrXtEehp0'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails('mailto:info@vektor.training', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

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
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no subscriptions' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let sent = 0
    for (const row of subs) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({ title, body, url: url || '/' }))
        sent++
      } catch (e) {
        console.error('push failed:', e.message)
        // Si la suscripción expiró, eliminarla
        if (e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('user_id', user_id)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})
