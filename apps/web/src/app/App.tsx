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
import { useAccountStore } from '@/stores/accountStore'
import { useLearnStore } from '@/stores/learnStore'
import { usePlanStore } from '@/stores/planStore'
import { usePointsStore } from '@/stores/pointsStore'
import { useQuotaStore } from '@/stores/quotaStore'
import { startPointsEngine } from '@/services/pointsEngine'
import { QuotaGate } from '@/components/Quota'
import { UIKit } from '@/components/UIKit'
import { BrowserGuard } from '@/components/BrowserGuard'
import { trackEvent, trackVisit, setAdmin } from '@/services/stats'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/plan', label: '计划' },
  { to: '/points', label: '积分' },
  { to: '/wordbooks', label: '词书' },
  { to: '/learn', label: '学习' },
  { to: '/review', label: '复习' },
  { to: '/wrongbook', label: '错题本' },
  { to: '/grammar', label: '语法' },
  { to: '/listening', label: '听力' },
  { to: '/speaking', label: '口语' },
  { to: '/dialogue', label: '对话' },
  { to: '/writing', label: '写作' },
  { to: '/reading', label: '阅读' },
  { to: '/library', label: '书库' },
  { to: '/photo', label: '拍照' },
  { to: '/stats', label: '统计' },
  { to: '/account', label: '我的' },
  { to: '/ui', label: 'UI Kit' },
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
}

export default function App() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
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

  // 统计：每次页面加载记一次访问，路由切换记一次 pageview
  useEffect(() => {
    trackVisit()
  }, [])

  // 启动云同步：确保有账号 → 拉云端数据合并 → 之后自动上传
  useEffect(() => {
    void initAccount()
  }, [initAccount])

  // 学习/复习过就自动打卡（不用手动点）
  useEffect(() => {
    const checkin = usePlanStore.getState().checkin
    const unsub = useLearnStore.subscribe((s) => {
      if ((s.todayLearned || 0) > 0 || (s.todayReviewed || 0) > 0) checkin()
    })
    // 已有进度时补一次
    const s = useLearnStore.getState()
    if ((s.todayLearned || 0) > 0 || (s.todayReviewed || 0) > 0) checkin()
    return unsub
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') trackEvent('pageview', location.pathname)
    setMenuOpen(false)   // 切页自动收起手机菜单
  }, [location.pathname])

  // 作者密钥：任意页面加 ?admin=<密钥> 即可开启无限 AI（存本机，地址栏立刻抹掉）
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
      // 不留痕：把密钥从地址栏移除，避免被截图/分享带出去
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

            {/* 桌面端：完整一行导航 */}
            <nav className="hidden md:flex items-center gap-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.to} to={item.to}>
                  {item.label}
                </NavItem>
              ))}
            </nav>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* 积分 / 会员 */}
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
                <span className="tabular-nums">{points >= 10000 ? `${Math.floor(points / 1000)}k` : points}</span>
              </NavLink>

              {/* 手机端：汉堡按钮 */}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden w-10 h-10 -mr-1 flex items-center justify-center rounded-lg text-xl text-ink-700 active:bg-ink-50"
                aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* 手机端展开菜单：两列大按钮，好点 */}
        {menuOpen && (
          <div className="md:hidden border-t border-ink-100 bg-white shadow-sm">
            <nav className="max-w-5xl mx-auto px-3 py-3 grid grid-cols-2 gap-2">
              {NAV_ITEMS.filter((i) => i.to !== '/ui').map((item) => (
                <NavItem key={item.to} to={item.to} block>
                  {item.label}
                </NavItem>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
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
          <Route path="/points" element={<PointsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/admin" element={<AdminUsagePage />} />
          <Route path="/ui" element={<UIKit />} />
        </Routes>
      </main>

      <footer className="border-t border-ink-100 py-5 mt-4 text-center text-xs text-ink-500 space-y-3">
        {/* 云同步状态 */}
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
    </div>
  )
}

function NavItem({
  to,
  children,
  block = false,
}: {
  to: string
  children: React.ReactNode
  block?: boolean
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          'transition-colors whitespace-nowrap',
          block
            ? 'px-3 py-3 rounded-lg text-center text-[15px] font-medium active:bg-ink-100'
            : 'px-3 py-1.5 rounded-md shrink-0',
          isActive ? 'bg-ink-900 text-white' : 'text-ink-600 hover:text-ink-900',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}
