/**
 * 每日推送提醒
 *
 * 只在 HTTPS + 用户明确同意后才订阅；iOS 需要先「添加到主屏幕」，
 * 否则 window.PushManager 不存在。
 */
import { config, fetchWithFallback } from '../config'

export interface PushSettings {
  subscribed: boolean
  enabled: boolean
  remindHour: number
  devices: number
}

export type PushSupport = 'ok' | 'ios-need-install' | 'unsupported' | 'denied' | 'no-sw'

function api(path: string): string {
  return config.aiGateway ? `${config.aiGateway}${path}` : path
}

async function call(path: string, init?: RequestInit): Promise<any> {
  const resp = await fetchWithFallback(path, api(path), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(body.slice(0, 120) || `请求失败 ${resp.status}`)
  }
  return resp.json()
}

/** iOS 上必须已「添加到主屏幕」才支持推送 */
export function detectSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true

  if (ios && !standalone) return 'ios-need-install'
  if (!('serviceWorker' in navigator)) return 'no-sw'
  if (!('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return 'ok'
}

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const buf = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buf
}

/** 当前设备是否已订阅 */
export async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator)) return null
    const reg = await navigator.serviceWorker.ready
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

/** 开启提醒：申请权限 → 订阅 → 上传到服务端 */
export async function enablePush(
  userId: string,
  remindHour = 20,
): Promise<PushSettings> {
  const support = detectSupport()
  if (support !== 'ok') throw new Error(support)

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('denied')

  const keyResp = await call('/api/push/key')
  if (!keyResp?.available || !keyResp.publicKey) {
    throw new Error('服务端未配置推送')
  }

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyResp.publicKey),
    })
  }

  const json: any = sub.toJSON()
  return call('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json?.keys?.p256dh || '',
      auth: json?.keys?.auth || '',
      remind_hour: remindHour,
      tz_offset: -new Date().getTimezoneOffset() / 60,
    }),
  })
}

/** 关闭提醒：退订并从服务端删除 */
export async function disablePush(userId: string): Promise<void> {
  try {
    const sub = await currentSubscription()
    if (sub) {
      await call('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    } else {
      await call('/api/push/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      })
    }
  } catch (e) {
    console.warn('[push] 退订失败:', e)
  }
}

export async function fetchSettings(userId: string): Promise<PushSettings> {
  return call(`/api/push/settings?user_id=${encodeURIComponent(userId)}`)
}

export async function updateSettings(
  userId: string,
  patch: { enabled?: boolean; remind_hour?: number },
): Promise<PushSettings> {
  return call('/api/push/settings', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, ...patch }),
  })
}

/** 发一条测试推送 */
export async function sendTest(userId: string): Promise<void> {
  await call(`/api/push/test?user_id=${encodeURIComponent(userId)}`, { method: 'POST' })
}
