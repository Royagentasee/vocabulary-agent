import { useEffect, useState } from 'react'
import { useAccountStore } from '@/stores/accountStore'
import { getPlatform, type PlatformInfo } from '@/services/platform'
import {
  currentSubscription,
  disablePush,
  enablePush,
  fetchSettings,
  sendTest,
  updateSettings,
} from '@/services/push'
import {
  calendarSubscribeHint,
  calendarUrl,
  copyText,
  downloadIcs,
  webcalUrl,
} from '@/services/calendar'
import { trackEvent } from '@/services/stats'

const HOURS = [7, 8, 12, 18, 19, 20, 21, 22]

/**
 * 每日提醒设置
 *
 * 关键：安卓/华为/荣耀/小米的网页推送在中国大陆基本收不到，
 * 所以这些平台默认推「日历提醒」；iOS（已加到主屏）和桌面端才推「推送通知」。
 */
export function ReminderCard() {
  const user = useAccountStore((s) => s.user)
  const [info, setInfo] = useState<PlatformInfo | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [hour, setHour] = useState(20)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')
  const [showPushAnyway, setShowPushAnyway] = useState(false)

  useEffect(() => {
    setInfo(getPlatform())
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

  if (!info) return null

  const flash = (t: string) => {
    setMsg(t)
    window.setTimeout(() => setMsg(''), 3200)
  }

  const copy = async (text: string, what: string) => {
    const ok = await copyText(text)
    setCopied(ok ? what : 'fail')
    window.setTimeout(() => setCopied(''), 2200)
    if (ok) trackEvent('calendar_copy', what)
  }

  const turnOnPush = async () => {
    if (!user?.id) return
    setBusy(true)
    try {
      const s = await enablePush(user.id, hour)
      setSubscribed(true)
      setEnabled(s.enabled ?? true)
      trackEvent('push_enable', info.platform)
      flash('已开启，试着给你发一条…')
      try {
        await sendTest(user.id)
      } catch {
        flash('已开启（测试推送未送达，稍后可能才生效）')
      }
    } catch (e: any) {
      const m = String(e?.message || '')
      if (m === 'denied') flash('你拒绝了通知权限，可在浏览器设置里重新允许')
      else flash('开启失败：' + m.slice(0, 50))
    } finally {
      setBusy(false)
    }
  }

  const turnOffPush = async () => {
    if (!user?.id) return
    setBusy(true)
    try {
      await disablePush(user.id)
      setSubscribed(false)
      setEnabled(false)
      trackEvent('push_disable', info.platform)
      flash('已关闭推送提醒')
    } finally {
      setBusy(false)
    }
  }

  const changeHour = async (h: number) => {
    setHour(h)
    if (!user?.id || !subscribed) return
    try {
      await updateSettings(user.id, { remind_hour: h })
    } catch {
      /* ignore */
    }
  }

  const showPush = info.pushReliable || showPushAnyway
  const showCalendar = info.reminderMode === 'calendar' || !info.pushReliable

  return (
    <section className="va-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">🔔 每日提醒</div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
          {info.name}
        </span>
      </div>

      <div className="text-xs text-ink-500 leading-relaxed">
        每天这个点，如果你还没学，就提醒你一下（学过就不打扰）。
      </div>

      {/* 时间选择 */}
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

      {/* 日历提醒：安卓/华为/荣耀/小米的主方案 */}
      {showCalendar && (
        <div className="space-y-2.5 border-t border-ink-100 pt-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">📅 日历提醒</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
              推荐
            </span>
          </div>

          {info.pushCaveat && (
            <div className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
              ⚠️ {info.pushCaveat}
            </div>
          )}

          <div className="text-xs text-ink-600 leading-relaxed">
            用系统日历每天提醒你 —— <strong>不需要网络、不需要装 App、国内全部机型可用</strong>。
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                downloadIcs(hour, user?.id || 'default')
                trackEvent('calendar_download', info.platform)
                flash('日历文件已开始下载，用系统日历打开即可')
              }}
              className="flex-1 py-2.5 rounded-xl bg-ink-900 text-white text-sm font-medium active:opacity-80"
            >
              下载日历文件
            </button>
            <button
              onClick={() => {
                window.location.href = webcalUrl(hour, user?.id || 'default')
                trackEvent('calendar_webcal', info.platform)
              }}
              className="px-3 py-2.5 rounded-xl bg-white border border-ink-100 text-xs active:bg-ink-50"
            >
              直接订阅
            </button>
          </div>

          <button
            onClick={() => copy(calendarUrl(hour, 0, user?.id || 'default'), 'url')}
            className="w-full text-xs text-ink-500 hover:text-ink-900 text-left"
          >
            {copied === 'url' ? '✅ 订阅链接已复制' : '📋 复制订阅链接（粘到手机日历里）'}
          </button>

          <details className="text-xs">
            <summary className="text-ink-500 cursor-pointer">各品牌日历怎么订阅？</summary>
            <div className="space-y-1.5 pt-2 pl-1">
              {calendarSubscribeHint().map((h) => (
                <div key={h.brand} className="leading-relaxed">
                  <span className="font-medium text-ink-700">{h.brand}：</span>
                  <span className="text-ink-500">{h.path}</span>
                </div>
              ))}
            </div>
          </details>

          {copied === 'fail' && (
            <div className="text-[11px] text-amber-700">
              浏览器不让自动复制，请手动选中链接复制。
            </div>
          )}
        </div>
      )}

      {/* 推送通知：只在可达时才作为主方案 */}
      {showPush ? (
        <div className="space-y-2.5 border-t border-ink-100 pt-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">🔔 应用内推送</span>
            {info.pushReliable && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                推荐
              </span>
            )}
          </div>

          {!info.pushCaveat && (
            <div className="text-xs text-ink-500 leading-relaxed">
              到点直接给手机发通知，点一下就能进来学习。
            </div>
          )}
          {info.pushCaveat && (
            <div className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
              ⚠️ {info.pushCaveat}
            </div>
          )}

          <div className="flex gap-2">
            {subscribed && enabled ? (
              <>
                <button
                  onClick={turnOffPush}
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl bg-ink-50 text-ink-700 text-sm active:bg-ink-100 disabled:opacity-40"
                >
                  关闭
                </button>
                <button
                  onClick={async () => {
                    if (!user?.id) return
                    setBusy(true)
                    try {
                      await sendTest(user.id)
                      flash('测试推送已发出 —— 收到了吗？')
                    } catch (e: any) {
                      flash('发送失败：' + String(e?.message || '').slice(0, 40))
                    } finally {
                      setBusy(false)
                    }
                  }}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl bg-white border border-ink-100 text-xs active:bg-ink-50 disabled:opacity-40"
                >
                  发条测试
                </button>
              </>
            ) : (
              <button
                onClick={turnOnPush}
                disabled={busy || !info.canPush}
                className="flex-1 py-2.5 rounded-xl bg-white border border-ink-900 text-ink-900 text-sm font-medium active:bg-ink-50 disabled:opacity-40"
              >
                {busy ? '处理中…' : info.canPush ? '开启推送通知' : '当前环境不支持'}
              </button>
            )}
          </div>

          {info.pushReliable && subscribed && enabled && (
            <div className="text-[11px] text-ink-400 leading-relaxed">
              提示：如果一直收不到，检查手机是否把浏览器的通知权限关了，
              或开启了省电模式限制后台。
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowPushAnyway(true)}
          className="w-full text-[11px] text-ink-400 hover:text-ink-700 border-t border-ink-100 pt-3"
        >
          我知道收不到，还是想试试推送 →
        </button>
      )}

      {msg && <div className="text-xs text-accent-deep">{msg}</div>}
    </section>
  )
}
