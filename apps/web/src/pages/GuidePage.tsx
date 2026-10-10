import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AddToHome } from '@/components/AddToHome'
import { getPlatform } from '@/services/platform'
import { trackEvent } from '@/services/stats'

/** 新用户使用指南 */
export function GuidePage() {
  const [standalone, setStandalone] = useState(false)
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const p = getPlatform()
    setStandalone(p.standalone)
    setIsMobile(p.isMobile)
    trackEvent('guide_view', p.platform)
  }, [])

  return (
    <div className="space-y-5 max-w-2xl">
      <header className="space-y-1.5">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">📖 新手指南</h1>
        <p className="text-ink-500 text-sm">
          3 分钟看完，知道这个 App 怎么用、怎么装到手机上
        </p>
      </header>

      {/* 0. 装到主屏（放在最前，因为很多人会跳过） */}
      <section className="va-card space-y-3 border-green-200 bg-green-50/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">📲</span>
          <span className="font-semibold text-sm">第一步：添加到手机主屏幕</span>
        </div>
        <div className="text-xs text-ink-600 leading-relaxed">
          加完之后就像装了 App —— 全屏打开、有图标、能收提醒。
        </div>
        <AddToHome />
      </section>

      {/* 1. 这是什么 */}
      <section className="va-card space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="font-semibold text-sm">这是个什么 App</span>
        </div>
        <div className="text-sm text-ink-700 leading-relaxed">
          一个<strong>免费的 AI 英语学习工具</strong>，覆盖雅思 / 托福 / GRE / SAT /
          四六级 / 中高考。不用注册、不用付费、没有广告。
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['🗺️ 学习路径', '跟着走就行，不用想学什么'],
            ['🧠 AI 教练', '看你的数据给建议'],
            ['📷 拍照翻译', '拍书上英文，秒变中文'],
            ['🎧 1000 篇听力', '托福雅思真题素材'],
            ['📚 分级阅读', '初中 / 高中 / 大学'],
            ['📖 103 本书', '名著 + 分级故事'],
          ].map(([t, d]) => (
            <div key={t} className="bg-ink-50 rounded-lg px-2.5 py-2">
              <div className="font-medium text-ink-800">{t}</div>
              <div className="text-ink-500 mt-0.5 leading-snug">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 怎么开始 */}
      <section className="va-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <span className="font-semibold text-sm">第二步：从「学习路径」开始</span>
        </div>
        <div className="text-sm text-ink-700 leading-relaxed">
          打开 App 后，<strong>直接点「路径」</strong>。里面是一条安排好的主线，
          每天点「继续」就行 —— 你不用决定学什么。
        </div>
        <div className="bg-ink-50 rounded-xl p-3 space-y-2 text-xs">
          <div className="text-ink-500">路径长这样：</div>
          <div className="space-y-1 font-mono text-[11px] leading-relaxed text-ink-700">
            <div>U1 打基础　　✅ 已完成</div>
            <div>U2 养成习惯　▶️ 进行中　3/5 课</div>
            <div>U3 分级阅读　🔒 待解锁</div>
          </div>
          <div className="text-ink-500 leading-relaxed">
            你在别的页面做的事（背单词、听听力、练口语）都会<strong>自动算进路径</strong>，
            不用手动打卡。
          </div>
        </div>
        <Link
          to="/path"
          className="block text-center py-2.5 rounded-xl bg-ink-900 text-white text-sm font-medium"
        >
          现在就去看路径
        </Link>
      </section>

      {/* 3. 主要功能 */}
      <section className="va-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧭</span>
          <span className="font-semibold text-sm">主要功能在哪</span>
        </div>
        <div className="text-xs text-ink-500">
          手机底部有 5 个入口，其余功能点「⋯ 更多」
        </div>
        <div className="space-y-2">
          {[
            ['🗺️ 路径', '每天跟着做的主线', '/path'],
            ['📖 学习', '背新单词（先选词书）', '/wordbooks'],
            ['🧠 教练', '问它「我该怎么安排」', '/coach'],
            ['🏅 成就', '看徽章和排行榜', '/badges'],
            ['⋯ 更多', '听力 / 口语 / 阅读 / 拍照 / 书库…', '/guide'],
          ].map(([t, d, to]) => (
            <Link
              key={t}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-ink-50 active:bg-ink-100"
            >
              <span className="text-sm font-medium w-16 shrink-0">{t}</span>
              <span className="text-xs text-ink-500 flex-1">{d}</span>
              <span className="text-ink-300">›</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. 数据保存 */}
      <section className="va-card space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">☁️</span>
          <span className="font-semibold text-sm">第三步：记住你的同步码</span>
        </div>
        <div className="text-sm text-ink-700 leading-relaxed">
          学习进度会<strong>自动存到云端</strong>，不用注册。换手机时用
          <strong>同步码</strong>就能恢复。
        </div>
        <div className="text-xs text-ink-500 leading-relaxed bg-ink-50 rounded-lg px-3 py-2">
          同步码在「我的」页面。建议<strong>截图保存</strong>一下，
          或者直接换个手机打开同一个网址，会看到同一个进度。
        </div>
        <Link to="/account" className="text-xs text-accent-deep hover:underline">
          去「我的」查看同步码 →
        </Link>
      </section>

      {/* 5. 提醒 */}
      <section className="va-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <span className="font-semibold text-sm">第四步：开启每日提醒（可选）</span>
        </div>
        <div className="text-xs text-ink-500 leading-relaxed">
          <strong>只有你今天还没学</strong>才会提醒，学过就不打扰。
          到「我的」页面开启。
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-xl border border-green-200 bg-green-50/50 px-3 py-2.5 space-y-1.5">
            <div className="text-xs font-semibold text-green-800">📅 日历提醒（推荐）</div>
            <div className="text-[11px] text-ink-600 leading-relaxed">
              用系统日历提醒，<strong>不需要网络</strong>，
              小米 / 华为 / 荣耀 / OPPO / vivo / iPhone 全部可用。
            </div>
          </div>
          <div className="rounded-xl border border-ink-100 px-3 py-2.5 space-y-1.5">
            <div className="text-xs font-semibold text-ink-700">🔔 应用内推送</div>
            <div className="text-[11px] text-ink-600 leading-relaxed">
              iPhone（已加到主屏）和电脑上可用。安卓因为依赖 Google 服务，
              中国大陆通常收不到。
            </div>
          </div>
        </div>

        <div className="text-[11px] text-ink-500 leading-relaxed bg-ink-50 rounded-lg px-3 py-2.5">
          <strong>为什么安卓收不到推送？</strong>
          安卓浏览器的网页推送要经过 Google 的服务器，这个服务在中国大陆无法访问；
          小米、华为、荣耀、QQ、UC 等浏览器也大多没有开放这个接口。
          所以安卓用户建议用<strong>日历提醒</strong> —— 效果一样，而且更省电。
        </div>
      </section>

      {/* 6. 常见问题 */}
      <section className="va-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">❓</span>
          <span className="font-semibold text-sm">常见问题</span>
        </div>
        <div className="space-y-2.5">
          {[
            [
              '发音点不出来 / 没声音',
              '先点一下页面任意位置再点喇叭（手机禁止自动播放）。如果还是没声音，检查是否开了静音。',
            ],
            [
              '拍照识别不准',
              '光线要够、手机尽量和书页平行、一次拍 4-6 行。识别结果可以手动改。',
            ],
            [
              'AI 功能提示额度用完',
              '单词解释每天 100 次、写作 2 次、口语 5 次、对话 10 次、语法 10 次、拍照翻译 10 次。' +
                '用积分兑换会员即可无限。',
            ],
            [
              '换手机进度没了',
              '到「我的」→ 用同步码恢复。建议提前把同步码截图保存。',
            ],
            [
              '为什么安卓收不到推送提醒',
              '安卓的网页推送依赖 Google 服务，中国大陆无法访问；' +
                '小米/华为/荣耀/QQ/UC 浏览器也大多没开放这个接口。' +
                '建议改用「我的 → 每日提醒 → 日历提醒」，用系统日历提醒，效果一样。',
            ],
            [
              '能在微信里直接用吗',
              '能看，但微信内置浏览器不支持添加到主屏幕和推送通知。' +
                '建议点右上角「⋯」→「在浏览器打开」。',
            ],
            [
              '要花钱吗',
              '不要。核心功能全部免费，没有广告。觉得有用可以请作者喝杯咖啡。',
            ],
          ].map(([q, a]) => (
            <details key={q} className="group">
              <summary className="text-sm font-medium cursor-pointer list-none flex items-center gap-1.5 text-ink-800">
                <span className="text-ink-300 group-open:rotate-90 transition-transform">▶</span>
                {q}
              </summary>
              <div className="text-xs text-ink-600 leading-relaxed pl-5 pt-1.5">{a}</div>
            </details>
          ))}
        </div>
      </section>

      <div className="text-center pb-4">
        <Link
          to="/path"
          className="inline-block px-6 py-3 rounded-xl bg-ink-900 text-white text-sm font-medium"
        >
          开始学习 →
        </Link>
      </div>
    </div>
  )
}
