export function MePage() {
  return (
    <div className="p-8 max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">我的</h1>
      <div className="va-card">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-ink-900 flex items-center justify-center text-white text-2xl">👤</div>
          <div>
            <div className="font-semibold">用户</div>
            <div className="text-sm text-ink-500">登录后可同步学习数据</div>
          </div>
        </div>
      </div>
      <div className="va-card text-sm text-ink-500">
        <div>版本 0.1.0</div>
        <div>© 2026 Vocabulary Agent</div>
      </div>
    </div>
  )
}