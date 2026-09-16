/**
 * UI Kit 组件展示
 *
 * 用于展示所有基础 UI 组件的效果，方便查看设计风格。
 */
import { clsx } from 'clsx'

export function UIKit() {
  return (
    <div className="min-h-screen bg-ink-50 p-8 space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">UI Kit</h1>
      <p className="text-sm text-ink-500">Vocabulary Agent 设计系统组件展示</p>

      {/* 01 - 按钮 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">01 · 按钮 (Button)</h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button className="va-btn va-btn--primary va-btn--md">主按钮</button>
            <button className="va-btn va-btn--secondary va-btn--md">次按钮</button>
            <button className="va-btn va-btn--ghost va-btn--md">文字按钮</button>
            <button className="va-btn va-btn--primary va-btn--md" disabled>禁用态</button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="va-btn va-btn--primary va-btn--sm">Small</button>
            <button className="va-btn va-btn--primary va-btn--md">Medium</button>
            <button className="va-btn va-btn--primary va-btn--lg">Large</button>
          </div>
        </div>
      </section>

      {/* 02 - 卡片 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">02 · 卡片 (Card)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="va-card">
            <div className="w-10 h-10 rounded-lg bg-ink-900 mb-3" />
            <div className="font-semibold text-base">基础卡片</div>
            <div className="text-sm text-ink-500 mt-1">默认样式</div>
          </div>
          <div className="va-card" style={{ boxShadow: '0 4px 16px rgba(17,17,17,0.08)' }}>
            <div className="w-10 h-10 rounded-lg bg-accent mb-3" />
            <div className="font-semibold text-base">悬浮卡片</div>
            <div className="text-sm text-ink-500 mt-1">带阴影强调</div>
          </div>
          <div className="va-card border-2 border-ink-900">
            <div className="w-10 h-10 rounded-lg bg-success mb-3" />
            <div className="font-semibold text-base">选中卡片</div>
            <div className="text-sm text-ink-500 mt-1">边框强调</div>
          </div>
        </div>
      </section>

      {/* 03 - 输入框 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">03 · 输入框 (Input)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="w-full px-4 py-2.5 bg-white border border-ink-100 rounded-xl focus:outline-none focus:border-ink-900"
            placeholder="默认输入框..."
          />
          <input
            className="w-full px-4 py-2.5 bg-white border border-ink-900 rounded-xl focus:outline-none"
            placeholder="聚焦态..."
            defaultValue="聚焦时边框变深"
          />
          <input
            className="w-full px-4 py-2.5 bg-ink-50 border border-ink-100 rounded-xl text-ink-500 cursor-not-allowed"
            placeholder="禁用..."
            disabled
          />
        </div>
      </section>

      {/* 04 - 标签 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">04 · 标签 (Tag)</h2>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full bg-ink-900 text-white text-xs">默认</span>
          <span className="px-3 py-1 rounded-full bg-accent-soft text-accent-deep text-xs">信息</span>
          <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs">成功</span>
          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs">警告</span>
          <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs">错误</span>
          <span className="px-3 py-1 rounded-full bg-ink-50 text-ink-500 text-xs">次要</span>
        </div>
      </section>

      {/* 05 - 数据展示 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">05 · 统计卡 (Stat Card)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="va-card text-center">
            <div className="text-3xl font-semibold">128</div>
            <div className="text-sm text-ink-500 mt-1">总词数</div>
          </div>
          <div className="va-card text-center">
            <div className="text-3xl font-semibold">89%</div>
            <div className="text-sm text-ink-500 mt-1">完成率</div>
          </div>
          <div className="va-card text-center">
            <div className="text-3xl font-semibold">7</div>
            <div className="text-sm text-ink-500 mt-1">连续天数</div>
          </div>
          <div className="va-card text-center">
            <div className="text-3xl font-semibold">2,450</div>
            <div className="text-sm text-ink-500 mt-1">复习总数</div>
          </div>
        </div>
      </section>

      {/* 06 - 进度条 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">06 · 进度条 (Progress)</h2>
        <div className="space-y-4">
          {[
            { value: 25, label: '25%' },
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
            { value: 100, label: '100%' },
          ].map(({ value, label }) => (
            <div key={value}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">进度</span>
                <span className="text-sm text-ink-500">{label}</span>
              </div>
              <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ink-900 transition-all"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 07 - 排版 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">07 · 排版 (Typography)</h2>
        <div className="space-y-3 va-card">
          <div className="text-4xl font-semibold tracking-tight">大标题 (display)</div>
          <div className="text-2xl font-semibold">标题 (heading)</div>
          <div className="text-base">正文 (body)</div>
          <div className="text-sm text-ink-500">辅助文字 (caption)</div>
          <div className="text-xs text-ink-500 font-mono">Mono · code</div>
        </div>
      </section>

      {/* 08 - 颜色 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">08 · 颜色 (Colors)</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ColorSwatch name="Ink 900" bg="#111111" />
          <ColorSwatch name="Ink 500" bg="#6b7280" />
          <ColorSwatch name="Ink 100" bg="#eeeef0" />
          <ColorSwatch name="Accent" bg="#3b82f6" />
          <ColorSwatch name="Success" bg="#10b981" />
        </div>
      </section>

      {/* 09 - 单词卡片 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">09 · 单词卡片 (Word Card)</h2>
        <div className="va-card text-center py-12 max-w-md">
          <div className="text-5xl font-semibold tracking-tight">ephemeral</div>
          <div className="text-ink-500 mt-3 font-mono">/ɪˈfem.ər.əl/</div>
          <div className="mt-6">
            <div className="text-2xl text-ink-900">短暂的；瞬息的</div>
            <div className="text-sm text-ink-500 italic mt-2">
              lasting for a very short time
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-6">
            <div className="va-btn va-btn--md bg-red-50 text-red-700 border-0 text-sm">忘记</div>
            <div className="va-btn va-btn--md bg-amber-50 text-amber-700 border-0 text-sm">困难</div>
            <div className="va-btn va-btn--md bg-blue-50 text-blue-700 border-0 text-sm">良好</div>
            <div className="va-btn va-btn--md bg-green-50 text-green-700 border-0 text-sm">简单</div>
          </div>
        </div>
      </section>

      {/* 10 - 空状态 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">10 · 空状态 (Empty State)</h2>
        <div className="va-card text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <div className="text-lg font-semibold mb-2">还没有学习记录</div>
          <div className="text-sm text-ink-500 mb-6">选一本词书开始你的学习之旅</div>
          <button className="va-btn va-btn--primary va-btn--md">选词书开始</button>
        </div>
      </section>
    </div>
  )
}

function ColorSwatch({ name, bg }: { name: string; bg: string }) {
  return (
    <div className="va-card p-4 text-center">
      <div
        className="w-full h-16 rounded-lg mb-2"
        style={{ backgroundColor: bg }}
      />
      <div className="text-xs font-medium">{name}</div>
      <div className="text-xs text-ink-500 font-mono">{bg}</div>
    </div>
  )
}