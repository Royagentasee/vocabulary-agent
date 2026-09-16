import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { WordbooksPage } from '@/pages/WordbooksPage'
import { ReviewPage } from '@/pages/ReviewPage'
import { StatsPage } from '@/pages/StatsPage'
import { PracticePage } from '@/pages/PracticePage'
import { MePage } from '@/pages/MePage'
import { settings } from '@/services/settings'

export default function App() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    settings.get().then((s) => s.theme && setTheme(s.theme))
  }, [])

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-ink-100 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-ink-100">
          <div className="w-8 h-8 rounded-lg bg-ink-900 flex items-center justify-center text-white text-sm font-bold">
            V
          </div>
          <div className="ml-3">
            <div className="font-semibold text-sm">Vocabulary Agent</div>
            <div className="text-xs text-ink-500">Desktop</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem to="/" label="首页" icon="🏠" />
          <NavItem to="/wordbooks" label="词书" icon="📚" />
          <NavItem to="/review" label="复习" icon="🎯" />
          <NavItem to="/practice" label="练习" icon="✍️" />
          <NavItem to="/stats" label="统计" icon="📊" />
          <NavItem to="/me" label="我的" icon="👤" />
        </nav>

        <div className="p-3 border-t border-ink-100 text-xs text-ink-500">
          <div>版本 0.1.0</div>
          <div>© 2026 Vocabulary Agent</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/wordbooks" element={<WordbooksPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/me" element={<MePage />} />
        </Routes>
      </main>
    </div>
  )
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-900'
        }`
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}