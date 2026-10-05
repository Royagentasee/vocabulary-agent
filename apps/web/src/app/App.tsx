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
import { UIKit } from '@/components/UIKit'
import { BrowserGuard } from '@/components/BrowserGuard'
import { trackEvent, trackVisit } from '@/services/stats'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
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
  { to: '/stats', label: '统计' },
  { to: '/ui', label: 'UI Kit' },
]

export default function App() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // 统计：每次页面加载记一次访问，路由切换记一次 pageview
  useEffect(() => {
    trackVisit()
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') trackEvent('pageview', location.pathname)
    setMenuOpen(false)   // 切页自动收起手机菜单
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <BrowserGuard />
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
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/admin" element={<AdminUsagePage />} />
          <Route path="/ui" element={<UIKit />} />
        </Routes>
      </main>

      <footer className="border-t border-ink-100 py-5 mt-4 text-center text-xs text-ink-500 space-y-2">
        <NavLink
          to="/support"
          className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-ink-100 bg-white text-ink-700 text-sm hover:border-ink-900 active:bg-ink-50"
        >
          ☕ 请作者喝杯咖啡
        </NavLink>
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
