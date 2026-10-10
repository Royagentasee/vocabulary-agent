import { useEffect, useState } from 'react'
import { useAccountStore } from '@/stores/accountStore'
import { useLearnStore } from '@/stores/learnStore'
import { wechatStatus } from '@/services/account'
import { getAdminToken, setAdmin, trackEvent } from '@/services/stats'
import { useQuotaStore } from '@/stores/quotaStore'
import { InviteCard } from '@/features/referral/InviteCard'
import { VoicePicker } from '@/features/settings/VoicePicker'

function timeAgo(ts: number): string {
  if (!ts) return '尚未同步'
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 10) return '刚刚'
  if (s < 60) return `${s} 秒前`
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}

export function AccountPage() {
  const { user, status, lastSyncAt, error, restore, regenerate, pushNow } = useAccountStore()
  const learnedWords = useLearnStore((s) => s.learnedWords)
  const wrongWords = useLearnStore((s) => s.wrongWords)
  const reset = useLearnStore((s) => s.reset)

  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wx, setWx] = useState<{ configured: boolean; hint: string } | null>(null)

  useEffect(() => {
    wechatStatus().then(setWx).catch(() => {})
    trackEvent('account_view')
  }, [])

  const copyCode = async () => {
    if (!user) return
    try {
      await navigator.clipboard.writeText(user.syncCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // http 或权限受限时兜底：选中文本让用户手动复制
      setMsg('复制失败，请长按上面的同步码手动复制')
    }
  }

  const doRestore = async () => {
    if (!code.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await restore(code.trim())
      setMsg('✅ 恢复成功！数据已合并到本机')
      setCode('')
    } catch (e: any) {
      setMsg(`❌ ${e?.message || '恢复失败，请检查同步码'}`)
    } finally {
      setBusy(false)
    }
  }

  const doRegenerate = async () => {
    if (!confirm('换新码后，旧同步码将立即失效。确定要换吗？')) return
    try {
      const c = await regenerate()
      setMsg(`✅ 新同步码：${c}（旧码已失效）`)
    } catch (e: any) {
      setMsg(`❌ ${e?.message || '生成失败'}`)
    }
  }

  const statusText: Record<string, string> = {
    idle: '未同步',
    pending: '有改动待同步…',
    syncing: '同步中…',
    synced: '已同步',
    error: '同步失败',
  }
  const statusColor: Record<string, string> = {
    idle: 'text-ink-500',
    pending: 'text-amber-600',
    syncing: 'text-blue-600',
    synced: 'text-green-600',
    error: 'text-red-600',
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <header>
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">账号与同步</h1>
        <p className="text-ink-500 mt-1.5 text-sm">
          学习数据自动备份到云端，换手机 / 换浏览器都不会丢
        </p>
      </header>

      {/* 同步状态 */}
      <section className="va-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☁️</span>
            <div>
              <div className={`text-sm font-medium ${statusColor[status] || ''}`}>
                {statusText[status] || status}
              </div>
              <div className="text-xs text-ink-500">上次同步：{timeAgo(lastSyncAt)}</div>
            </div>
          </div>
          <button
            onClick={() => pushNow()}
            disabled={status === 'syncing'}
            className="va-btn va-btn--secondary va-btn--sm disabled:opacity-40"
          >
            立即同步
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-ink-50 rounded-lg px-3 py-2">
            <div className="text-xs text-ink-500">已备份单词</div>
            <div className="font-semibold">{learnedWords.length}</div>
          </div>
          <div className="bg-ink-50 rounded-lg px-3 py-2">
            <div className="text-xs text-ink-500">错题本</div>
            <div className="font-semibold">{wrongWords.length}</div>
          </div>
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}
      </section>

      {/* 同步码 */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold">你的同步码</div>

        <div className="flex items-center gap-2">
          <div className="flex-1 text-center font-mono text-xl sm:text-2xl font-semibold tracking-wider bg-ink-50 rounded-xl py-3 select-all">
            {user?.syncCode || '——'}
          </div>
          <button onClick={copyCode} className="va-btn va-btn--secondary va-btn--sm shrink-0">
            {copied ? '已复制' : '复制'}
          </button>
        </div>

        <div className="text-xs text-ink-500 leading-relaxed">
          在<strong className="text-ink-700">另一台设备</strong>打开本应用 → 进入本页面 →
          输入这个码 → 学习数据自动恢复。
        </div>
        <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          ⚠️ 建议截图保存。同步码是找回数据的唯一凭证，清理浏览器数据后没有它就找不回来了。
        </div>

        <button onClick={doRegenerate} className="text-xs text-ink-400 hover:text-ink-700">
          换个新同步码（旧码作废）
        </button>
      </section>

      {/* 恢复 */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold">在另一台设备恢复数据</div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && doRestore()}
            placeholder="输入同步码，如 VA-7K3M-9PQ2"
            className="flex-1 px-3 py-2.5 bg-white border border-ink-100 rounded-xl font-mono text-sm focus:outline-none focus:border-ink-900"
          />
          <button
            onClick={doRestore}
            disabled={busy || !code.trim()}
            className="va-btn va-btn--primary va-btn--md disabled:opacity-40 shrink-0"
          >
            {busy ? '恢复中…' : '恢复'}
          </button>
        </div>
        <div className="text-xs text-ink-500">
          恢复会与本机数据<strong>合并</strong>（取并集），不会覆盖你已学的内容。
        </div>
      </section>

      {msg && (
        <div className="text-sm text-ink-700 bg-white border border-ink-100 rounded-xl px-3 py-2.5">
          {msg}
        </div>
      )}

      {/* 发音音色 */}
      <VoicePicker />

      {/* 邀请好友 */}
      <InviteCard />

      {/* 作者模式 */}
      {getAdminToken() && (
        <section className="va-card space-y-2 border-amber-200 bg-amber-50/40">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            👑 作者模式
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800">
              已启用
            </span>
          </div>
          <div className="text-xs text-amber-800">
            你这个账号的 AI 功能<strong>不限次数</strong>（写作、口语、对话、语法、单词解释全部无限），
            也不受每日额度影响。
          </div>
          <button
            onClick={() => {
              if (confirm('退出作者模式？退出后 AI 功能将恢复每日额度限制。')) {
                setAdmin(false)
                void useQuotaStore.getState().refresh()
                setMsg('已退出作者模式')
              }
            }}
            className="text-xs text-amber-700 hover:underline"
          >
            退出作者模式
          </button>
        </section>
      )}

      {/* 微信登录 */}
      <section className="va-card space-y-2">
        <div className="text-sm font-semibold flex items-center gap-2">
          💚 微信登录
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-500">
            {wx?.configured ? '已启用' : '待开通'}
          </span>
        </div>
        {wx?.configured ? (
          <div className="text-xs text-ink-500">微信登录已配置，登录入口即将上线。</div>
        ) : (
          <>
            <div className="text-xs text-ink-500 leading-relaxed">
              微信登录需要<strong className="text-ink-700">微信开放平台企业主体 + 网站应用审核</strong>
              （300 元认证费，审核 1-2 周）。开通后即可扫码登录、自动同步，不用再记同步码。
            </div>
            {wx?.hint && <div className="text-[11px] text-ink-400">{wx.hint}</div>}
          </>
        )}
      </section>

      {/* 危险操作 */}
      <section className="va-card space-y-2">
        <div className="text-sm font-semibold">本机数据</div>
        <button
          onClick={() => {
            if (confirm('将清空本机的学习记录（云端备份不受影响）。确定吗？')) {
              reset()
              setMsg('已清空本机数据。可以从云端恢复。')
            }
          }}
          className="text-xs text-red-600 hover:underline"
        >
          清空本机学习数据
        </button>
      </section>
    </div>
  )
}
