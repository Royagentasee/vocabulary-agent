import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEntitlementStore } from '@/stores/entitlementStore'
import { untilText } from '@/services/entitlement'
import { usePointsStore } from '@/stores/pointsStore'
import { trackEvent } from '@/services/stats'
import { fetchMyClaim, submitClaim, type Claim } from '@/services/payment'
import { isWechat } from '@/services/platform'

/** 会员权益：手机上两列紧凑排，别把付款按钮挤到屏幕外 */
const PERKS = [
  ['🎧', '听力精听'],
  ['🎙️', '口语跟读'],
  ['💬', '对话陪练'],
  ['✍️', '写作批改'],
  ['📰', '分级阅读'],
  ['📷', '拍照翻译'],
  ['📐', '语法专项'],
  ['🧠', 'AI 教练'],
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
  const [showQr, setShowQr] = useState(false)
  const [wechat] = useState(() => isWechat())

  useEffect(() => {
    void refresh(true)
    trackEvent('upgrade_view')
    void fetchMyClaim().then(setClaim).catch(() => {})
  }, [refresh])

  const price = ent?.price ?? 9.9
  const paid = !!ent?.isPro

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

  /* ============ 已是会员：只给结论，不展示付款 ============ */
  if (paid) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <section className="va-card space-y-3 border-green-200 bg-green-50/50 text-center py-8">
          <div className="text-5xl">👑</div>
          <div className="text-lg font-semibold text-green-800">
            会员已开通{ent?.isAdmin ? '（作者）' : ''}
          </div>
          <div className="text-sm text-green-700">{untilText(ent?.proUntil || '')}</div>
          <div className="text-xs text-ink-600">全部功能已解锁，AI 不限次数。</div>
          <Link
            to="/path"
            className="inline-block px-6 py-2.5 rounded-xl bg-ink-900 text-white text-sm font-medium"
          >
            去学习 →
          </Link>
        </section>
        <section className="va-card space-y-2">
          <div className="text-sm font-semibold">会员包含</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {PERKS.map(([e, t]) => (
              <div key={t} className="flex items-center gap-2 text-sm text-ink-700">
                <span>{e}</span>
                {t}
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-lg mx-auto">
      {/* ============ 价格 ============ */}
      <section className="va-card text-center space-y-1.5 !py-5">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-semibold">¥{price}</span>
          <span className="text-sm text-ink-500">/ 月</span>
        </div>
        <div className="text-xs text-ink-500">不到一杯奶茶 · 不是自动续费</div>
        {ent?.trialActive && (
          <div className="inline-block text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 mt-1">
            🎁 试用还剩 {ent.trialDaysLeft} 天
          </div>
        )}
      </section>

      {/* ============ 付款（核心，尽量少占屏） ============ */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold text-center">
          {wechat ? '长按二维码识别支付' : '微信扫码支付'}
        </div>

        {/* 二维码默认小图，点开才放大 —— 否则手机上要滚动才看得到按钮 */}
        <button
          onClick={() => setShowQr((v) => !v)}
          className="mx-auto block"
          aria-label="展开或缩小收款码"
        >
          <img
            src="/pay/wechat.jpg"
            alt="微信收款码"
            className={`object-contain rounded-xl border border-ink-100 bg-white transition-all ${
              showQr ? 'w-full max-w-xs' : 'w-40'
            }`}
          />
        </button>
        <div className="text-center text-[11px] text-ink-400">
          {showQr ? '点图片可缩小' : '看不清？点一下放大'}
        </div>

        <div className="bg-ink-50 rounded-xl px-3 py-2.5 text-xs text-ink-600 leading-relaxed">
          {wechat ? (
            <>
              ① 长按上面的二维码 → 选「识别二维码」付款 ¥{price}
              <br />
              ② 付完回来点下面的按钮，作者核对到账就开通
            </>
          ) : (
            <>
              ① 用微信扫上面的码支付 ¥{price}
              <br />
              ② 付完回来点下面的按钮，作者核对到账就开通
            </>
          )}
        </div>

        {/* 主 CTA */}
        {claim && claim.status === 'pending' ? (
          <div className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-3 leading-relaxed text-center">
            ⏳ <strong>已收到你的申报</strong>
            <br />
            等作者核对微信收款记录后开通（一般几小时内）。
            <br />
            开通后你<strong>下次打开 App 自动生效</strong>，不用再操作。
            <br />
            <span className="text-amber-700 text-[11px]">
              申报时间：{String(claim.created_at || '').slice(0, 16).replace('T', ' ')}
            </span>
          </div>
        ) : claim && claim.status === 'rejected' ? (
          <div className="space-y-2">
            <div className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2.5 leading-relaxed">
              这条申报没核对上。可能金额或时间对不上 ——
              把付款截图发给作者，或重新提交（备注写清微信昵称和时间）。
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="微信昵称 + 付款时间"
              className="w-full px-3.5 py-3 bg-ink-50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ink-900"
            />
            <button
              onClick={doClaim}
              disabled={claimBusy}
              className="w-full py-3.5 rounded-xl bg-green-600 text-white text-sm font-semibold active:opacity-80 disabled:opacity-40"
            >
              {claimBusy ? '提交中…' : '重新提交'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注：微信昵称 + 付款时间（可选，填了核对更快）"
              className="w-full px-3.5 py-3 bg-ink-50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-ink-900"
            />
            <button
              onClick={doClaim}
              disabled={claimBusy}
              className="w-full py-3.5 rounded-xl bg-green-600 text-white text-sm font-semibold active:opacity-80 disabled:opacity-40"
            >
              {claimBusy ? '提交中…' : `✅ 我已付 ¥${price}，立即开通`}
            </button>
          </div>
        )}

        {err && <div className="text-xs text-red-600 text-center">{err}</div>}
        {msg && <div className="text-xs text-green-700 text-center">{msg}</div>}
      </section>

      {/* ============ 会员包含 ============ */}
      <section className="va-card space-y-2">
        <div className="text-sm font-semibold">会员包含</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {PERKS.map(([e, t]) => (
            <div key={t} className="flex items-center gap-2 text-sm text-ink-700">
              <span className="text-base">{e}</span>
              {t}
            </div>
          ))}
        </div>
        <div className="text-[11px] text-ink-500 pt-1.5 border-t border-ink-100 leading-relaxed">
          ✅ 背单词、书本阅读、复习、错题本、学习路径<strong>永久免费</strong>，不付费也能用。
        </div>
      </section>

      {/* ============ 备用入口（折叠） ============ */}
      <section className="va-card !p-0 divide-y divide-ink-100 overflow-hidden">
        <button
          onClick={() => setShowCode((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium"
        >
          <span>🎟️ 我有激活码</span>
          <span className={`text-ink-400 transition-transform ${showCode ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {showCode && (
          <div className="px-4 py-3.5 space-y-2.5">
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
          </div>
        )}

        <Link
          to="/points"
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium"
        >
          <span>⭐ 用积分兑换</span>
          <span className="text-ink-400 text-xs">
            {memberUntil ? `到期 ${memberUntil}` : '学习攒积分 →'}
          </span>
        </Link>
      </section>

      <div className="text-center text-[11px] text-ink-400 leading-relaxed pb-4">
        付了款但没开通？把付款截图发给作者即可（见「支持作者」）。
      </div>
    </div>
  )
}
