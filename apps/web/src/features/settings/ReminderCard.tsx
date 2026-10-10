import { useEffect, useState } from 'react'
import { useAccountStore } from '@/stores/accountStore'
import {
  currentSubscription,
  detectSupport,
  disablePush,
  enablePush,
  fetchSettings,
  sendTest,
  updateSettings,
  type PushSettings,
  type PushSupport,
} from '@/services/push'
import { trackEvent } from '@/services/stats'

const HOURS = [7, 8, 12, 18, 19, 20, 21, 22]

/** 每日提醒设置 */
export function ReminderCard() {
  const user = useAccountStore((s) => s.user)
  const [support, setSupport] = useState<PushSupport>('ok')
  const [subscribed, setSubscribed] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [hour, setHour] = useState(20)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setSupport(detectSupport())
    void (async () => {
      const sub = await currentSubscription()
      setSubscribed(!!sub)
      if (user?.id) {
        try {
          const s = await fetchSettings(user.id)
          setEnabled(s.enabled)
          if (s.remindHour != null) setHour(s.remindHour)
        } catch {
          /* ignore */
        }
      }
    })()
  }, [user?.id])

  const flash = (t: string) => {
    setMsg(t)
    window.setTimeout(() => setMsg(''), 3000)
  }

  const turnOn = async () => {
    if (!user?.id) return
    setBusy(true)
    try {
      const s: PushSettings = await enablePush(user.id, hour)
      setSubscribed(true)
      setEnabled(s.enabled ?? true)
      trackEvent('push_enable')
      flash('已开启，试着给你发一条…')
      try {
        await sendTest(user.id)
      } catch {
        flash('已开启（测试推送未送达，可能刚订阅还没生效）')
      }
    } catch (e: any) {
      const m = String(e?.message || '')
      if (m === 'denied') flash('你拒绝了通知权限，可在浏览器设置里重新允许')
      else if (m === 'ios-need-install') flash('iPhone 需要先「添加到主屏幕」才能收推送')
      else if (support === 'unsupported') flash('当前浏览器不支持推送')
      else flash('开启失败：' + m.slice(0, 40))
    } finally {
      setBusy(false)
    }
  }

  const turnOff = async () => {
    if (!user?.id) return
    setBusy(true)
    try {
      await disablePush(user.id)
      setSubscribed(false)
      setEnabled(false)
      trackEvent('push_disable')
      flash('已关闭提醒')
    } finally {
      setBusy(false)
    }
  }

  const changeHour = async (h: number) => {
    setHour(h)
    if (!user?.id || !subscribed) return
    try {
      await updateSettings(user.id, { remind_hour: h })
      trackEvent('push_hour', String(h))
    } catch {
      /* ignore */
    }
  }

  const test = async () => {
    if (!user?.id) return
    setBusy(true)
    try {
      await sendTest(user.id)
      flash('测试推送已发出')
    } catch (e: any) {
      flash('发送失败：' + String(e?.message || '').slice(0, 40))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="va-card space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">🔔 每日提醒</div>
        {subscribed && enabled && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
            已开启
          </span>
        )}
      </div>

      <div className="text-xs text-ink-500 leading-relaxed">
        每天这个点，如果你还没学，就给你发一条提醒（学过就不打扰）。
      </div>

      {support === 'ios-need-install' && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
          📱 iPhone 需要先点浏览器底部的「分享」→「添加到主屏幕」，
          然后从主屏图标打开本页面，才能开启推送提醒。
        </div>
      )}

      {support === 'denied' && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          通知权限已被拒绝，请到浏览器的网站设置里重新允许。
        </div>
      )}

      {support === 'unsupported' && (
        <div className="text-xs text-ink-500 bg-ink-50 rounded-lg px-3 py-2">
          当前浏览器不支持推送通知（Chrome / Edge / Safari 16.4+ 可用）。
        </div>
      )}

      {/* 提醒时间 */}
      <div className="space-y-1.5">
        <div className="text-xs text-ink-500">提醒时间</div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {HOURS.map((h) => (
            <button
              key={h}
              onClick={() => changeHour(h)}
              className={`py-2 rounded-lg text-xs border transition-colors ${
                hour === h
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white border-ink-100 text-ink-700 hover:border-ink-900'
              }`}
            >
              {h}:00
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {subscribed && enabled ? (
          <>
            <button
              onClick={turnOff}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-ink-50 text-ink-700 text-sm active:bg-ink-100 disabled:opacity-40"
            >
              关闭提醒
            </button>
            <button
              onClick={test}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-white border border-ink-100 text-xs active:bg-ink-50 disabled:opacity-40"
            >
              发条测试
            </button>
          </>
        ) : (
          <button
            onClick={turnOn}
            disabled={busy || support === 'unsupported' || support === 'ios-need-install'}
            className="flex-1 py-2.5 rounded-xl bg-ink-900 text-white text-sm font-medium active:opacity-80 disabled:opacity-40"
          >
            {busy ? '处理中…' : '开启每日提醒'}
          </button>
        )}
      </div>

      {msg && <div className="text-xs text-accent-deep">{msg}</div>}
    </section>
  )
}
