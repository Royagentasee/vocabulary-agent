import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminToken } from '@/services/stats'
import { fetchReports, setReportStatus, type ReportItem } from '@/services/feedback'

type Tab = 'open' | 'fixed' | 'ignored' | 'all'

const TABS: [Tab, string][] = [
  ['open', '待处理'],
  ['fixed', '已修'],
  ['ignored', '已忽略'],
  ['all', '全部'],
]

function fmtTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ')
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 题目报错后台：查看用户报上来的错题并标记处理 */
export function AdminReportsPage() {
  const [token, setToken] = useState(getAdminToken())
  const [input, setInput] = useState('')
  const [tab, setTab] = useState<Tab>('open')
  const [items, setItems] = useState<ReportItem[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [badKey, setBadKey] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setBusy(true)
    setError('')
    setBadKey(false)
    try {
      const d = await fetchReports(tab)
      setItems(d.items || [])
      setTotal(d.total || 0)
      setStats(d.stats || {})
    } catch (e: any) {
      if (e?.message === 'FORBIDDEN') {
        setBadKey(true)
        localStorage.removeItem('va-admin-token')
        localStorage.removeItem('va-admin')
        setToken('')
      } else {
        setError(e?.message || '加载失败')
      }
    } finally {
      setBusy(false)
    }
  }, [tab, token])

  useEffect(() => {
    void load()
  }, [load])

  const mark = async (id: number, status: 'fixed' | 'ignored') => {
    const ok = await setReportStatus(id, status)
    if (ok) {
      setFlash(status === 'fixed' ? '已标记为修复' : '已忽略')
      window.setTimeout(() => setFlash(''), 1600)
      void load()
    }
  }

  if (!token || badKey) {
    return (
      <div className="max-w-md mx-auto space-y-4 py-10">
        <h1 className="text-xl font-semibold">题目报错后台</h1>
        <p className="text-sm text-ink-500">需要作者密钥</p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="粘贴作者密钥"
          className="w-full px-3.5 py-2.5 bg-white border border-ink-100 rounded-xl text-sm focus:outline-none focus:border-ink-900"
        />
        <button
          onClick={() => {
            const t = input.trim()
            if (!t) return
            localStorage.setItem('va-admin-token', t)
            localStorage.setItem('va-admin', '1')
            setToken(t)
            setBadKey(false)
          }}
          className="w-full py-2.5 rounded-xl bg-ink-900 text-white text-sm"
        >
          进入
        </button>
        <div className="text-xs text-ink-400">
          也可以在网址后面加 <code>?admin=密钥</code> 自动进入。
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">题目报错</h1>
          <p className="text-ink-500 mt-1 text-xs">
            用户报上来的错题。改完题库后点「已修」即可。
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={busy}
          className="px-3 py-1.5 rounded-lg bg-ink-900 text-white text-xs disabled:opacity-40 shrink-0"
        >
          {busy ? '加载中…' : '刷新'}
        </button>
      </header>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              tab === k
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white border-ink-100 text-ink-600'
            }`}
          >
            {label}
            {k === 'open' && stats.open ? ` (${stats.open})` : ''}
          </button>
        ))}
      </div>

      {flash && <div className="text-xs text-green-700">{flash}</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}

      {items.length === 0 ? (
        <div className="va-card text-center py-14 space-y-2">
          <div className="text-4xl">🎉</div>
          <div className="text-sm text-ink-600">这里没有报错</div>
          <div className="text-xs text-ink-400">共 {total} 条</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((it) => (
            <section key={it.id} className="va-card space-y-2">
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">
                  {it.kindLabel}
                </span>
                {it.topic && <span className="text-ink-400">{it.topic}</span>}
                {it.times > 1 && (
                  <span className="text-red-500 font-medium">{it.times} 人报错</span>
                )}
                <span className="text-ink-400 ml-auto">{fmtTime(it.created_at)}</span>
              </div>

              <div className="text-sm font-medium leading-relaxed">{it.question}</div>

              {it.options.length > 0 && (
                <div className="space-y-1">
                  {it.options.map((o, i) => {
                    const isCorrect = o === it.correct
                    const isChosen = o === it.chosen
                    return (
                      <div
                        key={i}
                        className={`text-xs px-2.5 py-1.5 rounded border ${
                          isCorrect
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : isChosen
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-ink-100 text-ink-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="flex-1">{o}</span>
                          {isCorrect && <span>我们标的答案</span>}
                          {isChosen && !isCorrect && <span>用户认为</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {it.note && (
                <div className="text-xs text-ink-600 bg-ink-50 rounded-lg px-2.5 py-2">
                  用户说明：{it.note}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {it.status === 'open' ? (
                  <>
                    <button
                      onClick={() => void mark(it.id, 'fixed')}
                      className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-[11px]"
                    >
                      ✓ 已修
                    </button>
                    <button
                      onClick={() => void mark(it.id, 'ignored')}
                      className="px-2.5 py-1 rounded-lg bg-ink-100 text-ink-600 text-[11px]"
                    >
                      忽略
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-ink-400">
                    {it.status === 'fixed' ? '已修' : '已忽略'} · {fmtTime(it.handled_at)}
                  </span>
                )}
                {it.status !== 'open' && (
                  <button
                    onClick={() => void mark(it.id, 'fixed')}
                    className="text-[11px] text-ink-400 hover:text-ink-700 ml-auto"
                  >
                    重新标记
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <Link to="/admin" className="text-xs text-ink-400 hover:text-ink-700 inline-block">
        ← 返回运营后台
      </Link>
    </div>
  )
}
