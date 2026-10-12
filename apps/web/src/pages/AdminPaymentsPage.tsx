import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveClaim,
  createCodes,
  fetchClaims,
  rejectClaim,
  type ClaimRow,
  type PaymentStats,
} from '@/services/payment'
import { getAdminToken } from '@/services/stats'

/**
 * 收款后台（作者用）
 *
 * 核心：用户付款后申报 → 这里核对微信收款记录 → 点「确认开通」
 * 用户下次打开 App 自动变会员，不用发码、不用加微信。
 */
export function AdminPaymentsPage() {
  const [token, setToken] = useState(getAdminToken())
  const [input, setInput] = useState('')
  const [tab, setTab] = useState<'pending' | 'approved' | 'all'>('pending')
  const [items, setItems] = useState<ClaimRow[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [badKey, setBadKey] = useState(false)
  const [days, setDays] = useState(30)

  const load = async (which = tab) => {
    setLoading(true)
    setErr('')
    try {
      const d = await fetchClaims(which)
      setItems(d.items)
      setStats(d.stats)
      setBadKey(false)
    } catch (e: any) {
      const m = String(e?.message || '')
      // 密钥失效：清掉本地密钥并让用户重新输入，
      // 否则会出现「后台界面显示了但一直是 403」的困惑状态
      if (m.includes('作者权限') || m.includes('403')) {
        setBadKey(true)
        try {
          localStorage.removeItem('va-admin-token')
        } catch {
          /* ignore */
        }
      } else {
        setErr(m || '加载失败')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) void load(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token])

  const flash = (t: string) => {
    setMsg(t)
    window.setTimeout(() => setMsg(''), 3500)
  }

  const approve = async (id: number) => {
    try {
      const r = await approveClaim(id, days)
      flash(`已开通 ${days} 天，到期 ${String(r.proUntil || '').slice(0, 10)}`)
      void load(tab)
    } catch (e: any) {
      flash('开通失败：' + (e?.message || ''))
    }
  }

  const reject = async (id: number) => {
    if (!confirm('确定驳回这条申报？')) return
    try {
      await rejectClaim(id)
      flash('已驳回')
      void load(tab)
    } catch (e: any) {
      flash('驳回失败：' + (e?.message || ''))
    }
  }

  const gen = async () => {
    try {
      const r = await createCodes(10, days, '后台生成')
      setCodes(r.codes || [])
      flash(`已生成 ${r.count} 张激活码`)
      void load(tab)
    } catch (e: any) {
      flash('生成失败：' + (e?.message || ''))
    }
  }

  // 密钥无效 或 没登录作者模式 → 都显示输入界面
  if (!token || badKey) {
    return (
      <div className="max-w-md mx-auto space-y-4 py-8">
        <h1 className="text-xl font-semibold">收款后台</h1>
        <div className="va-card space-y-3">
          <div className="text-sm text-ink-600">
            {badKey ? '⚠️ 密钥无效或已过期，请重新输入。' : '需要作者密钥才能查看。'}
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入作者密钥"
            className="w-full px-3 py-2.5 bg-ink-50 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ink-900"
          />
          <button
            onClick={() => {
              try {
                localStorage.setItem('va-admin-token', input.trim())
                localStorage.setItem('va-admin', '1')
              } catch {
                /* ignore */
              }
              setToken(input.trim())
              setBadKey(false)
            }}
            className="w-full py-2.5 rounded-xl bg-ink-900 text-white text-sm"
          >
            进入
          </button>
          <div className="text-[11px] text-ink-400">
            也可以在网址后面加 <code>?admin=密钥</code> 自动进入。
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">💰 收款后台</h1>
        <p className="text-ink-500 text-sm">
          核对微信收款记录后点「确认开通」，用户下次打开 App 自动生效
        </p>
      </header>

      {/* 概览 */}
      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            ['待处理', stats?.claims?.pending ?? 0, (stats?.claims?.pending ?? 0) > 0 ? 'text-amber-600' : ''],
            ['已开通', stats?.claims?.approved ?? 0, 'text-green-600'],
            ['收入', `¥${stats?.claims?.revenue ?? 0}`, 'text-ink-900'],
            ['未用激活码', stats?.codes?.unused ?? 0, ''],
          ].map(([label, val, cls]) => (
            <div key={String(label)} className="va-card !p-3 text-center">
              <div className={`text-xl font-semibold tabular-nums ${cls}`}>{val}</div>
              <div className="text-[11px] text-ink-500 mt-0.5">{label}</div>
            </div>
          ))}
        </section>
      )}

      {/* 开通天数 */}
      <section className="va-card flex items-center gap-3 flex-wrap">
        <span className="text-sm text-ink-600">确认开通用</span>
        <div className="flex gap-1.5">
          {[30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs border ${
                days === d ? 'bg-ink-900 text-white border-ink-900' : 'border-ink-100 text-ink-600'
              }`}
            >
              {d} 天
            </button>
          ))}
        </div>
        <button
          onClick={gen}
          className="ml-auto px-3 py-1.5 rounded-lg bg-ink-50 text-xs text-ink-700 active:bg-ink-100"
        >
          生成 10 张激活码
        </button>
      </section>

      {codes.length > 0 && (
        <section className="va-card space-y-2">
          <div className="text-sm font-semibold">刚生成的激活码（{days} 天）</div>
          <div className="font-mono text-xs grid grid-cols-2 sm:grid-cols-3 gap-1">
            {codes.map((c) => (
              <div key={c} className="bg-ink-50 rounded px-2 py-1 select-all">
                {c}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(codes.join('\n')).catch(() => {})}
            className="text-xs text-accent-deep hover:underline"
          >
            复制全部
          </button>
        </section>
      )}

      {/* 标签 */}
      <div className="flex gap-2">
        {(
          [
            ['pending', '待处理'],
            ['approved', '已开通'],
            ['all', '全部'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
              tab === k
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-600 border-ink-100'
            }`}
          >
            {label}
            {k === 'pending' && stats && (stats?.claims?.pending ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                {stats?.claims?.pending ?? 0}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => load(tab)}
          className="ml-auto px-3 py-2 rounded-lg bg-ink-50 text-xs text-ink-600"
        >
          刷新
        </button>
      </div>

      {msg && <div className="text-sm text-accent-deep">{msg}</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {/* 列表 */}
      {loading ? (
        <div className="text-sm text-ink-500 py-10 text-center">加载中…</div>
      ) : items.length === 0 ? (
        <div className="va-card text-center text-sm text-ink-500 py-10">
          {tab === 'pending' ? '没有待处理的申报 🎉' : '暂无记录'}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="va-card space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{it.sync_code || '—'}</span>
                    <span className="text-xs text-ink-500">¥{it.amount}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        it.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : it.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-ink-100 text-ink-500'
                      }`}
                    >
                      {it.status === 'pending' ? '待处理' : it.status === 'approved' ? '已开通' : '已驳回'}
                    </span>
                  </div>
                  {it.note && (
                    <div className="text-xs text-ink-600 mt-1 break-all">备注：{it.note}</div>
                  )}
                  <div className="text-[11px] text-ink-400 mt-0.5">
                    申报于 {String(it.created_at || '').slice(0, 16).replace('T', ' ')}
                    {it.handled_at && ` · 处理于 ${String(it.handled_at).slice(0, 16).replace('T', ' ')}`}
                  </div>
                </div>

                {it.status === 'pending' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => approve(it.id)}
                      className="px-3 py-2 rounded-lg bg-ink-900 text-white text-xs font-medium"
                    >
                      确认开通
                    </button>
                    <button
                      onClick={() => reject(it.id)}
                      className="px-2.5 py-2 rounded-lg bg-ink-50 text-ink-500 text-xs"
                    >
                      驳回
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="va-card text-xs text-ink-500 space-y-1.5">
        <div className="text-sm font-semibold text-ink-700">核对流程</div>
        <ol className="space-y-1 leading-relaxed list-decimal list-inside">
          <li>打开微信 → 我 → 服务 → 钱包 → 账单</li>
          <li>找对应金额（¥{stats?.price ?? 9.9}）的收款记录，核对时间</li>
          <li>对得上就点「确认开通」；对不上先驳回</li>
          <li>用户下次打开 App 会自动变成会员，不用通知他</li>
        </ol>
        <div className="pt-1.5 border-t border-ink-100">
          想送人会员或者做活动，用上面的「生成激活码」。
        </div>
      </section>

      <div className="pb-4 text-center">
        <Link to="/admin" className="text-xs text-ink-400 hover:text-ink-700">
          去使用数据后台 →
        </Link>
      </div>
    </div>
  )
}
