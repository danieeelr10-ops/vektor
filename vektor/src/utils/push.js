const VAPID_PUBLIC_KEY = 'BBUnGUHYPFTJSSFz1HpavEaksNsc8RcAKMhS8XJzvXEYgENZ3l_DNDCNM7R1UCBTXchUFw-0317ZPFhrXtEehp0'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function registerPush(userId, supabase) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    subscription: sub.toJSON(),
  }, { onConflict: 'user_id' })

  return true
}

export async function unregisterPush(userId, supabase) {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (reg) {
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  }
  await supabase.from('push_subscriptions').delete().eq('user_id', userId)
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function isPushSubscribed() {
  if (!isPushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}
