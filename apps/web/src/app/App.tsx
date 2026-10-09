import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { WordbooksPage } from '@/pages/WordbooksPage'
import { LearnPage } from '@/pages/LearnPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { StatsPage } from '@/pages/StatsPage'
import { AdminUsagePage } from '@/pages/AdminUsagePage'
import { WrongbookPage } from '@/pages/WrongbookPage'
import { WritingPage } from '@/pages/WritingPage'
import { ReadingPage } from '@/pages/ReadingPage'
import { GrammarPage } from '@/pages/GrammarPage'
import { ListeningPage } from '@/pages/ListeningPage'
import { SpeakingPage } from '@/pages/SpeakingPage'
import { DialoguePage } from '@/pages/DialoguePage'
import { LibraryPage } from '@/pages/LibraryPage'
import { BookReaderPage } from '@/pages/BookReaderPage'
import { SupportPage } from '@/pages/SupportPage'
import { AccountPage } from '@/pages/AccountPage'
import { PlanPage } from '@/pages/PlanPage'
import { PointsPage } from '@/pages/PointsPage'
import { PhotoPage } from '@/pages/PhotoPage'
import { PathPage } from '@/pages/PathPage'
import { CoachPage } from '@/pages/CoachPage'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { useAccountStore } from '@/stores/accountStore'
import { useLearnStore } from '@/stores/learnStore'
import { usePlanStore } from '@/stores/planStore'
import { usePointsStore } from '@/stores/pointsStore'
import { useQuotaStore } from '@/stores/quotaStore'
import { usePathStore } from '@/stores/pathStore'
import { startPointsEngine } from '@/services/pointsEngine'
import { QuotaGate } from '@/components/Quota'
import { UIKit } from '@/components/UIKit'
import { BrowserGuard } from '@/components/BrowserGuard'
import { trackEvent, trackVisit, setAdmin } from '@/services/stats'

interface NavGroup {
  label: string
  emoji: string
  items: { to: string; label: string; emoji: string }[]
}

/** 桌面端：按用途分组，避免一行塞 20 个入口 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: '学习',
    emoji: '📚',
    items: [
      { to: '/path', label: '学习路径', emoji: '🗺️' },
      { to: '/coach', label: 'AI 教练', emoji: '🧠' },
      { to: '/plan', label: '学习计划', emoji: '📅' },
      { to: '/wordbooks', label: '词书', emoji: '📕' },
      { to: '/learn', label: '学习新词', emoji: '📖' },
      { to: '/review', label: '复习', emoji: '🔄' },
      { to: '/wrongbook', label: '错题本', emoji: '❌' },
    ],
  },
  {
    label: '练习',
    emoji: '🎯',
    items: [
      { to: '/listening', label: '听力', emoji: '🎧' },
      { to: '/speaking', label: '口语跟读', emoji: '🎙️' },
      { to: '/dialogue', label: '对话陪练', emoji: '💬' },
      { to: '/reading', label: '阅读', emoji: '📰' },
      { to: '/writing', label: '写作', emoji: '✍️' },
      { to: '/library', label: '书库', emoji: '📚' },
      { to: '/photo', label: '拍照翻译', emoji: '📷' },
      { to: '/grammar', label: '语法', emoji: '📐' },
    ],
  },
  {
    label: '进步',
    emoji: '📈',
    items: [
      { to: '/badges', label: '成就与排行', emoji: '🏅' },
      { to: '/points', label: '积分会员', emoji: '⭐' },
      { to: '/stats', label: '学习报告', emoji: '📊' },
    ],
  },
  {
    label: '我的',
    emoji: '👤',
    items: [
      { to: '/account', label: '账号与同步', emoji: '☁️' },
      { to: '/support', label: '支持作者', emoji: '☕' },
    ],
  },
]

/** 手机端：底部常驻 4 个主入口 + 「更多」 */
const TAB_ITEMS = [
  { to: '/path', label: '路径', emoji: '🗺️' },
  { to: '/learn', label: '学习', emoji: '📖' },
  { to: '/coach', label: '教练', emoji: '🧠' },
  { to: '/badges', label: '成就', emoji: '🏅' },
]

/** 路由 → 模块 id，用于「首次体验」积分奖励 */
const ROUTE_MODULE: Record<string, string> = {
  '/learn': 'learn',
  '/review': 'review',
  '/listening': 'listening',
  '/speaking': 'speaking',
  '/dialogue': 'dialogue',
  '/writing': 'writing',
  '/reading': 'reading',
  '/library': 'library',
  '/grammar': 'grammar',
  '/plan': 'plan',
  '/coach': 'coach',
}

export default function App() {
  const location = useLocation()
  const [openGroup, setOpenGroup] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const initAccount = useAccountStore((s) => s.init)
  const syncStatus = useAccountStore((s) => s.status)
  const user = useAccountStore((s) => s.user)
  const points = usePointsStore((s) => s.balance)
  const isMember = usePointsStore((s) => s.isMember())

  // 启动积分引擎（把学习/打卡行为换算成积分）
  useEffect(() => {
    startPointsEngine()
  }, [])

  // 账号就绪后拉取 AI 额度
  useEffect(() => {
    if (user) void useQuotaStore.getState().refresh()
  }, [user])

  // 进入某个模块即视为「首次体验」，发放探索奖励（每个模块只发一次）
  useEffect(() => {
    const mod = ROUTE_MODULE[location.pathname]
    if (mod) usePointsStore.getState().unlockModule(mod)
  }, [location.pathname])

  // 学习路径：学新词/复习的行为自动记账（按增量）
  useEffect(() => {
    const report = usePathStore.getState().reportActivity
    let lastLearned = useLearnStore.getState().todayLearned
    let lastReviewed = useLearnStore.getState().todayReviewed

    const unsub = useLearnStore.subscribe((s) => {
      if (s.todayLearned < lastLearned) lastLearned = 0
      if (s.todayReviewed < lastReviewed) lastReviewed = 0
      const dL = s.todayLearned - lastLearned
      const dR = s.todayReviewed - lastReviewed
      if (dL > 0) { report('learn', dL); lastLearned = s.todayLearned }
      if (dR > 0) { report('review', dR); lastReviewed = s.todayReviewed }
    })
    return unsub
  }, [])

  // 统计：每次页面加载记一次访问
  useEffect(() => {
    trackVisit()
  }, [])

  // 启动云同步
  useEffect(() => {
    void initAccount()
  }, [initAccount])

  // 学习/复习过就自动打卡（不用手动点）
  useEffect(() => {
    const checkin = usePlanStore.getState().checkin
    const unsub = useLearnStore.subscribe((s) => {
      if ((s.todayLearned || 0) > 0 || (s.todayReviewed || 0) > 0) checkin()
    })
    const s = useLearnStore.getState()
    if ((s.todayLearned || 0) > 0 || (s.todayReviewed || 0) > 0) checkin()
    return unsub
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') trackEvent('pageview', location.pathname)
    setOpenGroup('')
    setSheetOpen(false)
  }, [location.pathname])

  // 作者密钥：任意页面加 ?admin=<密钥> 即可开启无限 AI
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('admin')
    if (!q) return
    if (q === '0') {
      setAdmin(false)
      return
    }
    if (q !== '1') {
      setAdmin(true, q)
      params.delete('admin')
      const qs = params.toString()
      window.history.replaceState({}, '', location.pathname + (qs ? `?${qs}` : ''))
      void useQuotaStore.getState().refresh()
    }
  }, [location.search, location.pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <BrowserGuard />
      <QuotaGate />

      {/* 点空白处收起桌面下拉 */}
      {openGroup && (
        <div className="hidden md:block fixed inset-0 z-20" onClick={() => setOpenGroup('')} />
      )}

      <header className="border-b border-ink-100 bg-white sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-3 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-md bg-ink-900 flex items-center justify-center text-white text-sm font-bold">
                V
              </div>
              <span className="font-semibold text-[15px] sm:text-base whitespace-nowrap">
                Vocabulary Agent
              </span>
            </NavLink>

            {/* 桌面端：分组下拉导航 */}
            <nav className="hidden md:flex items-center gap-0.5 text-sm">
              <DesktopLink to="/" label="Home" active={location.pathname === '/'} />
              {NAV_GROUPS.map((g) => {
                const groupActive = g.items.some((it) => location.pathname.startsWith(it.to))
                const open = openGroup === g.label
                return (
                  <div key={g.label} className="relative z-30">
                    <button
                      type="button"
                      onClick={() => setOpenGroup(open ? '' : g.label)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                        groupActive || open
                          ? 'bg-ink-900 text-white'
                          : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
                      }`}
                    >
                      <span>{g.emoji}</span>
                      <span>{g.label}</span>
                      <span className={`text-[9px] transition-transform ${open ? 'rotate-180' : ''}`}>
                        ▾
                      </span>
                    </button>

                    {open && (
                      <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-ink-100 rounded-xl shadow-lg py-1.5 overflow-hidden">
                        {g.items.map((it) => (
                          <NavLink
                            key={it.to}
                            to={it.to}
                            end
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                                isActive
                                  ? 'bg-ink-900 text-white'
                                  : 'text-ink-700 hover:bg-ink-50'
                              }`
                            }
                          >
                            <span>{it.emoji}</span>
                            <span>{it.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            <div className="flex items-center gap-1.5 shrink-0">
              <NavLink
                to="/points"
                className={({ isActive }) =>
                  `flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-ink-900 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`
                }
                title={isMember ? '会员中 · 查看积分' : '查看积分'}
              >
                <span>{isMember ? '🏅' : '⭐'}</span>
                <span className="tabular-nums">
                  {points >= 10000 ? `${Math.floor(points / 1000)}k` : points}
                </span>
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      {/* 手机底部标签栏会盖住内容，这里留出空间 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/wordbooks" element={<WordbooksPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/wrongbook" element={<WrongbookPage />} />
          <Route path="/grammar" element={<GrammarPage />} />
          <Route path="/listening" element={<ListeningPage />} />
          <Route path="/speaking" element={<SpeakingPage />} />
          <Route path="/dialogue" element={<DialoguePage />} />
          <Route path="/writing" element={<WritingPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/:bookId" element={<BookReaderPage />} />
          <Route path="/photo" element={<PhotoPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/path" element={<PathPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/badges" element={<LeaderboardPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/admin" element={<AdminUsagePage />} />
          <Route path="/ui" element={<UIKit />} />
        </Routes>
      </main>

      <footer className="border-t border-ink-100 py-5 mt-4 mb-16 md:mb-0 text-center text-xs text-ink-500 space-y-3">
        <NavLink
          to="/account"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === 'synced'
                ? 'bg-green-500'
                : syncStatus === 'error'
                ? 'bg-red-500'
                : syncStatus === 'idle'
                ? 'bg-ink-300'
                : 'bg-amber-500 animate-pulse'
            }`}
          />
          {syncStatus === 'synced'
            ? '数据已同步到云端'
            : syncStatus === 'syncing' || syncStatus === 'pending'
            ? '正在同步…'
            : syncStatus === 'error'
            ? '同步失败，点击查看'
            : '云同步'}
          {user && <span className="font-mono text-ink-400">{user.syncCode}</span>}
        </NavLink>

        <div>
          <NavLink
            to="/support"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-ink-100 bg-white text-ink-700 text-sm hover:border-ink-900 active:bg-ink-50"
          >
            ☕ 请作者喝杯咖啡
          </NavLink>
        </div>
        <div>Vocabulary Agent · MVP v0.1</div>
      </footer>

      {/* ============ 手机端：底部标签栏 ============ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink-100 pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {TAB_ITEMS.map((t) => {
            const active = location.pathname === t.to
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                  active ? 'text-ink-900' : 'text-ink-400'
                }`}
              >
                <span className={`text-lg leading-none ${active ? '' : 'opacity-60'}`}>
                  {t.emoji}
                </span>
                <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{t.label}</span>
              </NavLink>
            )
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              sheetOpen ? 'text-ink-900' : 'text-ink-400'
            }`}
            aria-label="更多"
          >
            <span className="text-lg leading-none opacity-60">⋯</span>
            <span className="text-[10px]">更多</span>
          </button>
        </div>
      </nav>

      {/* ============ 手机端：更多（上滑面板） ============ */}
      {sheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 flex items-end"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl max-h-[82vh] overflow-auto pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-ink-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold">全部功能</span>
              <button
                onClick={() => setSheetOpen(false)}
                className="text-ink-400 text-lg leading-none px-2"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            <div className="px-4 py-4 space-y-5">
              <NavLink
                to="/"
                end
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-ink-50 text-sm active:bg-ink-100"
              >
                <span className="text-lg">🏠</span>
                <span>首页</span>
              </NavLink>

              {NAV_GROUPS.map((g) => (
                <div key={g.label} className="space-y-2">
                  <div className="text-xs font-semibold text-ink-400 px-1">
                    {g.emoji} {g.label}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {g.items.map((it) => (
                      <NavLink
                        key={it.to}
                        to={it.to}
                        end
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm transition-colors ${
                            isActive
                              ? 'bg-ink-900 text-white'
                              : 'bg-ink-50 text-ink-800 active:bg-ink-100'
                          }`
                        }
                      >
                        <span className="text-base">{it.emoji}</span>
                        <span className="truncate">{it.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DesktopLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <NavLink
      to={to}
      end
      className={`px-3 py-1.5 rounded-md transition-colors ${
        active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-50'
      }`}
    >
      {label}
    </NavLink>
  )
}
