import { useEffect, useState } from 'react'
import { useAccountStore } from '@/stores/accountStore'
import { fetchReferralStats, ReferralStats } from '@/services/account'
import { trackEvent } from '@/services/stats'

/**
 * 邀请好友卡片
 *
 * 用同步码当邀请码（已经是唯一短码，不用再造一套）。
 * 好友通过 ?invite=码 打开 App，注册后双方都拿积分。
 */
export function InviteCard() {
  const user = useAccountStore((s) => s.user)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!user?.id) return
    fetchReferralStats(user.id).then(setStats).catch(() => {})
  }, [user?.id])

  const code = stats?.inviteCode || user?.syncCode || ''
  const link = code
    ? `${window.location.origin}/?invite=${encodeURIComponent(code)}`
    : ''

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      trackEvent('invite_copy', what)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      /* 剪贴板不可用（http 或权限），让用户手动选中 */
      setCopied('fail')
      setTimeout(() => setCopied(''), 2500)
    }
  }

  const share = async () => {
    const text =
      `我在用 Vocabulary Agent 学英语 —— AI 单词解释、1000 篇听力、` +
      `分级阅读、拍照翻译都有，免费的。\n\n用我的邀请码注册，你我都能拿积分：\n${link}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Vocabulary Agent', text, url: link })
        trackEvent('invite_share')
        return
      } catch {
        /* 用户取消 */
      }
    }
    void copy(text, 'share')
  }

  if (!code) return null

  return (
    <section className="va-card space-y-3 border-green-200 bg-green-50/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">🎁 邀请好友，双方得积分</div>
          <div className="text-xs text-ink-500 mt-0.5">
            好友注册即得 {stats?.inviteeReward ?? 50} 分，你得 {stats?.inviterReward ?? 100} 分
          </div>
        </div>
        {(stats?.invitedCount ?? 0) > 0 && (
          <div className="text-right shrink-0">
            <div className="text-lg font-semibold text-green-700 tabular-nums">
              {stats?.invitedCount}
            </div>
            <div className="text-[10px] text-ink-500">已邀请</div>
          </div>
        )}
      </div>

      {/* 邀请码 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white border border-green-200 rounded-xl px-3 py-2.5">
          <div className="text-[10px] text-ink-400">我的邀请码</div>
          <div className="font-mono font-semibold tracking-wider text-sm">{code}</div>
        </div>
        <button
          onClick={() => copy(code, 'code')}
          className="px-3 py-2.5 rounded-xl bg-white border border-green-200 text-xs active:bg-green-50 shrink-0"
        >
          {copied === 'code' ? '已复制 ✓' : '复制'}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={share}
          className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:opacity-80"
        >
          {copied === 'share' ? '已复制 ✓' : '分享邀请链接'}
        </button>
        <button
          onClick={() => copy(link, 'link')}
          className="px-3 py-2.5 rounded-xl bg-white border border-green-200 text-xs active:bg-green-50 shrink-0"
        >
          {copied === 'link' ? '已复制 ✓' : '复制链接'}
        </button>
      </div>

      {copied === 'fail' && (
        <div className="text-[11px] text-amber-700">
          浏览器不让自动复制，请长按上面的邀请码手动复制
        </div>
      )}

      <div className="text-[11px] text-ink-500 leading-relaxed border-t border-green-100 pt-2.5">
        💡 好友通过你的链接打开并注册，<strong>双方积分自动到账</strong>（下次打开时领取）。
        积分可以兑换会员，解锁无限 AI。
      </div>

      {(stats?.earned ?? 0) > 0 && (
        <div className="text-xs text-green-700">
          已通过邀请累计获得 <strong>{stats?.earned}</strong> 积分
        </div>
      )}
    </section>
  )
}
