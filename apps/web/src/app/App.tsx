import { useEffect } from 'react'
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
  { to: '/writing', label: '写作' },
  { to: '/reading', label: '阅读' },
  { to: '/stats', label: '统计' },
  { to: '/ui', label: 'UI Kit' },
]

export default function App() {
  const location = useLocation()

  // 统计：每次页面加载记一次访问，路由切换记一次 pageview
  useEffect(() => {
    trackVisit()
  }, [])

  useEffect(() => {
    if (location.pathname !== '/') trackEvent('pageview', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <BrowserGuard />
      <header className="border-b border-ink-100 bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-ink-900 flex items-center justify-center text-white text-sm font-bold">
                V
              </div>
              <span className="font-semibold">Vocabulary Agent</span>
            </div>

            {/* 统一导航：所有设备都显示完整一行，与电脑版一致 */}
            <nav className="flex items-center gap-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.to} to={item.to}>
                  {item.label}
                </NavItem>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/wordbooks" element={<WordbooksPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/wrongbook" element={<WrongbookPage />} />
          <Route path="/grammar" element={<GrammarPage />} />
          <Route path="/listening" element={<ListeningPage />} />
          <Route path="/writing" element={<WritingPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/admin" element={<AdminUsagePage />} />
          <Route path="/ui" element={<UIKit />} />
        </Routes>
      </main>

      <footer className="border-t border-ink-100 py-4 text-center text-xs text-ink-500">
        Vocabulary Agent · MVP v0.1
      </footer>
    </div>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
          isActive ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
