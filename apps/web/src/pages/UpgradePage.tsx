import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEntitlementStore } from '@/stores/entitlementStore'
import { untilText } from '@/services/entitlement'
import { usePointsStore } from '@/stores/pointsStore'
import { QuotaBadge } from '@/components/Quota'
import { trackEvent } from '@/services/stats'
import { fetchMyClaim, submitClaim, type Claim } from '@/services/payment'

const PERKS = [
  ['🎧', '听力精听', '1000 篇托福 / 雅思材料'],
  ['🎙️', '口语跟读', 'AI 纠正发音，标注问题音素'],
  ['💬', '对话陪练', '和 AI 用英语聊，实时改语法'],
  ['✍️', '写作批改', '307 道官方真题逐句点评'],
  ['📰', '分级阅读', '初中 / 高中 / 大学 + SAT 真题'],
  ['📷', '拍照翻译', '拍书上英文，秒变中文'],
  ['📐', '语法专项', '20 个知识点，AI 出题'],
  ['🧠', 'AI 学习教练', '看你的数据给备考建议'],
]

export function UpgradePage() {
  const [params] = useSearchParams()
  const ent = useEntitlementStore((s) => s.ent)
  const refresh = useEntitlementStore((s) => s.refresh)
  const redeem = useEntitlementStore((s) => s.redeem)
  const memberUntil = usePointsStore((s) => s.memberUntil)

  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(params.get('code') === '1')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [claim, setClaim] = useState<Claim | null>(null)
  const [note, setNote] = useState('')
  const [claimBusy, setClaimBusy] = useState(false)

  useEffect(() => {
    void refresh(true)
    trackEvent('upgrade_view')
    void fetchMyClaim().then(setClaim).catch(() => {})
  }, [refresh])

  const doClaim = async () => {
    setClaimBusy(true)
    setErr('')
    try {
      const c = await submitClaim(note.trim(), price)
      setClaim(c)
      setNote('')
      trackEvent('payment_claim')
    } catch (e: any) {
      setErr(e?.message || '提交失败')
    } finally {
      setClaimBusy(false)
    }
  }

  const doRedeem = async () => {
    const c = code.trim()
    if (!c) return
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      await redeem(c)
      setMsg('开通成功！所有功能已解锁 🎉')
      setCode('')
      trackEvent('redeem_ok')
    } catch (e: any) {
      setErr(e?.message || '兑换失败')
    } finally {
      setBusy(false)
    }
  }

  const paid = !!ent?.isPro
  const price = ent?.price ?? 9.9

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <header className="space-y-1.5">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">开通会员</h1>
        <p className="text-ink-500 text-sm">
          背单词和读书永久免费，会员解锁其余全部功能
        </p>
      </header>

      {/* 当前状态 */}
      {paid ? (
        <section className="va-card space-y-2 border-green-200 bg-green-50/50">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <div>
              <div className="text-sm font-semibold text-green-800">
                会员已开通{ent?.isAdmin ? '（作者）' : ''}
              </div>
              <div className="text-xs text-green-700">{untilText(ent?.proUntil || '')}</div>
            </div>
          </div>
          <div className="text-xs text-ink-600">所有功能已解锁，AI 使用不限次数。</div>
        </section>
      ) : ent?.trialActive ? (
        <section className="va-card space-y-1.5 border-amber-200 bg-amber-50/50">
          <div className="text-sm font-semibold text-amber-800">
            🎁 免费试用中，还剩 {ent.trialDaysLeft} 天
          </div>
          <div className="text-xs text-amber-700">
            试用期内所有功能都能用。到期后免费的部分是：背单词 + 读书。
          </div>
        </section>
      ) : (
        <section className="va-card space-y-1.5">
          <div className="text-sm font-semibold">试用已结束</div>
          <div className="text-xs text-ink-500">
            背单词和读书依然免费，以下是会员才能用的功能。
          </div>
        </section>
      )}

      {/* 权益 */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold">会员包含</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PERKS.map(([e, t, d]) => (
            <div key={t} className="flex items-start gap-2.5 text-sm">
              <span className="text-base shrink-0">{e}</span>
              <div className="min-w-0">
                <div className="font-medium text-ink-800">{t}</div>
                <div className="text-[11px] text-ink-500 leading-snug">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 价格 */}
      <section className="va-card space-y-3 border-ink-900">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-semibold">¥{price}</span>
          <span className="text-sm text-ink-500">/ 月</span>
        </div>
        <div className="text-center text-xs text-ink-500">
          不到一杯奶茶 · 随时可停 · 不是自动续费
        </div>

        {/* 付款方式 */}
        <div className="border-t border-ink-100 pt-3 space-y-3">
          <div className="text-sm font-semibold">怎么付款</div>

          <div className="flex flex-col items-center gap-2">
            <img
              src="/pay/wechat.jpg"
              alt="微信收款码"
              className="w-48 h-48 object-contain rounded-xl border border-ink-100 bg-white"
            />
            <div className="text-xs text-ink-500 text-center leading-relaxed">
              微信扫码付 <strong>¥{price}</strong>
              <br />
              <span className="text-ink-400">（长按图片保存后，用微信扫一扫 → 相册选图）</span>
            </div>
          </div>

          <ol className="space-y-1.5 text-xs text-ink-600">
            {[
              `扫码支付 ¥${price}`,
              '把付款截图发给作者（微信 / 邮件）',
              '作者回你一个激活码',
              '在下面输入激活码，立刻开通 30 天',
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-ink-900 text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>

          <div className="text-[11px] text-ink-400 leading-relaxed bg-ink-50 rounded-lg px-3 py-2">
            💡 个人收款码无法自动扣费，所以是「付款 → 发码」的模式。
            好处是<strong>不会自动续费扣你钱</strong>；缺点是开通需要作者手动发码，
            可能不是秒到。
          </div>
        </div>
      </section>

      {/* 已付款申报 */}
      {!paid && (
        <section className="va-card space-y-3">
          <div className="text-sm font-semibold">💸 我已经付过款了</div>

          {claim && claim.status === 'pending' ? (
            <div className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2.5 leading-relaxed">
              ⏳ 已收到你的申报，等作者核对微信收款记录后就会开通
              （一般几小时内，最慢一天）。<strong>开通后你下次打开 App 自动生效</strong>，
              不用再操作。
              <br />
              <span className="text-amber-700">
                申报时间：{String(claim.created_at || '').slice(0, 16).replace('T', ' ')}
              </span>
            </div>
          ) : claim && claim.status === 'approved' ? (
            <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2.5">
              ✅ 已开通 {claim.days} 天会员，刷新页面即可使用。
            </div>
          ) : claim && claim.status === 'rejected' ? (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2.5 leading-relaxed">
              这条申报没有核对上。可能是金额或时间对不上 ——
              请把付款截图发给作者，或重新提交一次（备注里写清微信昵称和付款时间）。
            </div>
          ) : (
            <div className="text-xs text-ink-500 leading-relaxed">
              付款后在这里点一下，作者核对到账就会给你开通。
              备注里写上<strong>微信昵称和付款时间</strong>能加快核对。
            </div>
          )}

          {(!claim || claim.status === 'rejected') && (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="微信昵称 + 付款时间（如：小明 10月12日 20:30）"
                className="w-full px-3.5 py-3 bg-ink-50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ink-900"
              />
              <button
                onClick={doClaim}
                disabled={claimBusy}
                className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-medium active:opacity-80 disabled:opacity-40"
              >
                {claimBusy ? '提交中…' : '提交，等作者开通'}
              </button>
            </>
          )}
        </section>
      )}

      {/* 激活码 */}
      <section className="va-card space-y-3">
        <button
          onClick={() => setShowCode((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold"
        >
          <span>🎟️ 输入激活码</span>
          <span className={`text-ink-400 transition-transform ${showCode ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showCode && (
          <div className="space-y-2.5">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && doRedeem()}
              placeholder="VA-XXXX-XXXX"
              className="w-full px-3.5 py-3 bg-ink-50 rounded-xl text-center font-mono tracking-widest text-sm focus:outline-none focus:ring-1 focus:ring-ink-900"
            />
            <button
              onClick={doRedeem}
              disabled={busy || !code.trim()}
              className="w-full py-3 rounded-xl bg-ink-900 text-white text-sm font-medium active:opacity-80 disabled:opacity-40"
            >
              {busy ? '兑换中…' : '开通会员'}
            </button>
            {err && <div className="text-xs text-red-600">{err}</div>}
            {msg && <div className="text-xs text-green-700">{msg}</div>}
          </div>
        )}
      </section>

      {/* 积分兑换（老用户已有的积分别浪费） */}
      <section className="va-card space-y-2">
        <div className="text-sm font-semibold">⭐ 也可以用积分兑换</div>
        <div className="text-xs text-ink-500 leading-relaxed">
          学习、打卡、做任务都能攒积分，积分可以兑换会员。
          {memberUntil ? ` 当前会员到期：${memberUntil}` : ''}
        </div>
        <Link to="/points" className="text-xs text-accent-deep hover:underline">
          去积分页面兑换 →
        </Link>
      </section>

      <div className="text-center text-[11px] text-ink-400 leading-relaxed pb-4">
        遇到问题？在「支持作者」页面能找到联系方式。
        <br />
        已付费但没收到码？直接把付款截图发给作者即可。
      </div>
    </div>
  )
}
