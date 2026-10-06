import { useEffect, useState } from 'react'
import { config, fetchWithFallback } from '@/config'
import { trackEvent } from '@/services/stats'

interface PayMethod {
  id: string
  name: string
  hint: string
  src: string
  emoji: string
}

// 收款码图片放在 apps/web/public/pay/ 下（构建后即站点根目录 /pay/）
// ⚠️ 必须原样使用微信导出的文件，不要转格式/压缩/截图：
//    微信在收款码里嵌了数字水印，任何二次处理都会让微信报「不支持截图使用」
// 注意：目录名不能叫 support，否则和 /support 路由同名冲突，nginx 会返回 403
const METHODS: PayMethod[] = [
  {
    id: 'wechat',
    name: '微信',
    hint: '在微信里打开本页，长按识别',
    src: '/pay/wechat.jpg',
    emoji: '💚',
  },
  {
    id: 'alipay',
    name: '支付宝',
    hint: '长按识别；或保存原图再扫',
    src: '/pay/alipay.jpg',
    emoji: '💙',
  },
]

/** 成本构成（按真实开销写） */
const COSTS = [
  { emoji: '🖥️', item: '服务器', detail: '东京 AWS，2核2G', amount: '约 ¥80 / 月' },
  { emoji: '🤖', item: 'AI 接口', detail: '查词 · 批改 · 陪练 · 纠音', amount: '约 ¥100-300 / 月' },
  { emoji: '🌐', item: '域名 + HTTPS', detail: 'earthledger.com + 证书', amount: '约 ¥50 / 年' },
]

/** 模块清单，用来讲「做了什么」 */
const MODULES = [
  '单词（词根词缀 + 发音）',
  'FSRS 间隔重复复习',
  '错题本',
  '语法 20 个知识点',
  '听力 1000 篇',
  '口语跟读 + AI 纠音',
  'AI 对话陪练',
  '写作真题 307 道 + AI 批改',
  '阅读真题 330 道',
  '书库 103 本（172 万词）',
  '每日打卡 + 考试倒计时',
  '积分会员 + 云同步',
]

export function SupportPage() {
  const [ok, setOk] = useState<Record<string, boolean>>({})
  const [learners, setLearners] = useState(0)

  useEffect(() => {
    document.title = '支持作者 · Vocabulary Agent'
    trackEvent('support_view')

    // 学习者人数（社会证明，拉不到就静默隐藏）
    const path = '/api/stats/overview?days=1'
    fetchWithFallback(path, config.aiGateway ? `${config.aiGateway}${path}` : path, { method: 'GET' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.totalUsers) setLearners(d.totalUsers)
      })
      .catch(() => {})

    return () => {
      document.title = 'Vocabulary Agent'
    }
  }, [])

  const available = METHODS.filter((m) => ok[m.id] !== false)
  const noneYet = METHODS.every((m) => ok[m.id] === false)

  return (
    <div className="space-y-4 sm:space-y-6 max-w-2xl">
      {/* 标题 */}
      <header className="text-center pt-3 space-y-2">
        <div className="text-5xl">☕</div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">请作者喝杯咖啡</h1>
        <p className="text-ink-500 text-sm">一个人 · 一台电脑 · 十二个模块</p>
      </header>

      {/* 作者的话 */}
      <section className="va-card space-y-3 text-sm leading-relaxed text-ink-600">
        <p>
          这个应用是我利用<strong className="text-ink-900">业余时间一个人做</strong>的。
          没有团队，没有融资，也没有广告。
        </p>
        <p>
          从背单词的 FSRS 记忆算法，到 1000 篇听力、103 本原版书、服务端语音识别、
          AI 作文批改…… 全部免费开放，
          <strong className="text-ink-900">没有会员墙，不充钱也能用全部功能</strong>。
        </p>
        {learners > 0 && (
          <p className="text-ink-500 text-xs">
            目前已有 <strong className="text-ink-900">{learners}</strong> 位同学在这里学习。
          </p>
        )}
      </section>

      {/* 做了什么 */}
      <section className="va-card space-y-2">
        <div className="text-sm font-semibold">已经做了这些</div>
        <div className="flex flex-wrap gap-1.5">
          {MODULES.map((m) => (
            <span key={m} className="text-[11px] px-2 py-1 rounded-full bg-ink-50 text-ink-600">
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* 钱花在哪 */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold">你的打赏花在哪</div>
        <div className="divide-y divide-ink-100">
          {COSTS.map((c) => (
            <div key={c.item} className="flex items-center gap-3 py-2.5">
              <span className="text-xl">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{c.item}</div>
                <div className="text-[11px] text-ink-400">{c.detail}</div>
              </div>
              <div className="text-xs text-ink-600 shrink-0">{c.amount}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-ink-500 bg-ink-50 rounded-lg px-3 py-2 leading-relaxed">
          说白了：你每查一个词、每改一篇作文、每听一段听力，
          背后都在花真金白银的接口费。
        </div>
      </section>

      {/* 收款码 */}
      {noneYet ? (
        <section className="va-card text-center text-sm text-ink-500 py-8">
          收款码还没配置好，稍后再来看看～
        </section>
      ) : (
        <section
          className={`grid gap-3 sm:gap-5 ${
            available.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {METHODS.map((m) => (
            <div
              key={m.id}
              className={`va-card text-center space-y-3 ${ok[m.id] === false ? 'hidden' : ''}`}
            >
              <div className="text-sm font-semibold">
                {m.emoji} {m.name}打赏
              </div>
              <div className="flex justify-center">
                <img
                  src={m.src}
                  alt={`${m.name}收款码`}
                  className="w-60 sm:w-72 h-auto rounded-xl shadow-sm"
                  onError={() => setOk((s) => ({ ...s, [m.id]: false }))}
                />
              </div>

              <a
                href={m.src}
                download={`${m.id}-qrcode.jpg`}
                className="inline-block text-xs text-accent-deep hover:underline"
              >
                ⬇ 保存原图到相册
              </a>

              <div className="text-xs text-ink-500">{m.hint}</div>

              <div className="text-[11px] text-ink-400 border-t border-ink-100 pt-2">
                金额随意，几块钱也是心意
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 扫码方法 */}
      <section className="va-card space-y-3 text-sm">
        <div className="font-medium">怎么扫码（请务必看这里）</div>

        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 leading-relaxed">
          ⚠️ <strong>不要截图后再扫！</strong> 微信在收款码里嵌了防伪水印，
          截图 / 转格式都会破坏它，微信会报「收款码不支持截图使用」。
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-green-700">✅ 方法一（最稳，推荐）</div>
          <ol className="list-decimal list-inside space-y-1 text-ink-600 text-xs sm:text-sm leading-relaxed">
            <li>把本页链接发到微信里（例如发给「文件传输助手」）</li>
            <li>
              <strong>在微信里打开</strong>这个链接（不要在 Safari/浏览器里打开）
            </li>
            <li>
              <strong>长按二维码</strong> → 选「识别图中二维码」→ 直接付款
            </li>
          </ol>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-green-700">✅ 方法二：电脑上扫</div>
          <div className="text-ink-600 text-xs sm:text-sm">
            电脑浏览器打开本页 → 手机微信「扫一扫」对着屏幕扫
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-green-700">✅ 方法三：保存原图再扫</div>
          <div className="text-ink-600 text-xs sm:text-sm">
            长按二维码 → 选「<strong>保存图片</strong>」（不要用系统截图）→ 微信「扫一扫」→
            右上角<strong>相册</strong> → 选刚保存的图片
          </div>
        </div>
      </section>

      {/* 不打赏也没关系 */}
      <section className="va-card space-y-1.5 text-center">
        <div className="text-sm text-ink-700">
          <strong>不打赏也完全没关系。</strong>
        </div>
        <div className="text-xs text-ink-500 leading-relaxed">
          你每天来学一点，就是对这个项目最好的支持 ❤️
        </div>
      </section>

      {/* 其他支持方式 */}
      <section className="va-card text-sm space-y-2">
        <div className="font-medium">想帮忙但不想花钱？</div>
        <ul className="space-y-1.5 text-ink-600 text-xs sm:text-sm">
          <li>• 把这个应用分享给正在备考的朋友</li>
          <li>• 发现 bug 或想加功能，直接跟作者说</li>
          <li>• 觉得哪里不好用，吐槽也是帮忙</li>
          <li>• 坚持每天学一点，就是最好的支持 🙌</li>
        </ul>
      </section>
    </div>
  )
}
