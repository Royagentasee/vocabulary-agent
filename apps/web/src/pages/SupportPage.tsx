import { useEffect, useState } from 'react'

interface PayMethod {
  id: string
  name: string
  hint: string
  src: string
  emoji: string
}

// 收款码图片放在 apps/web/public/pay/ 下（构建后即站点根目录 /pay/）
// 注意：目录名不能叫 support，否则和 /support 路由同名冲突，nginx 会返回 403
const METHODS: PayMethod[] = [
  {
    id: 'wechat',
    name: '微信',
    hint: '长按识别 / 截图后在微信扫一扫',
    src: '/pay/wechat.png',
    emoji: '💚',
  },
  {
    id: 'alipay',
    name: '支付宝',
    hint: '长按识别 / 截图后在支付宝扫一扫',
    src: '/pay/alipay.png',
    emoji: '💙',
  },
]

export function SupportPage() {
  const [ok, setOk] = useState<Record<string, boolean>>({})

  useEffect(() => {
    document.title = '支持作者 · Vocabulary Agent'
    return () => {
      document.title = 'Vocabulary Agent'
    }
  }, [])

  const available = METHODS.filter((m) => ok[m.id] !== false)
  const noneYet = METHODS.every((m) => ok[m.id] === false)

  return (
    <div className="space-y-5 sm:space-y-8 max-w-2xl">
      <header className="text-center pt-2">
        <div className="text-4xl sm:text-5xl">☕</div>
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight mt-3">
          请作者喝杯咖啡
        </h1>
        <p className="text-ink-500 mt-2 text-sm sm:text-base">
          如果这个应用帮到了你，可以打赏支持一下
        </p>
      </header>

      <section className="va-card space-y-3 text-sm leading-relaxed text-ink-600">
        <p>
          Vocabulary Agent 是我利用业余时间一个人做的：从背单词、复习算法，
          到语法、听力、口语跟读、对话陪练、写作批改、真题阅读和书库，全部免费开放。
        </p>
        <p>
          你的打赏会用在<span className="text-ink-900 font-medium">服务器和 AI 接口费用</span>
          上，让这个应用能一直免费跑下去、持续加新功能。
        </p>
        <p className="text-ink-500 text-xs">
          完全自愿，不打赏也照样用全部功能 ❤️
        </p>
      </section>

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
                {m.emoji} {m.name}赞赏
              </div>
              <div className="flex justify-center">
                <img
                  src={m.src}
                  alt={`${m.name}收款码`}
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl border border-ink-100 bg-white"
                  onError={() => setOk((s) => ({ ...s, [m.id]: false }))}
                />
              </div>
              <div className="text-xs text-ink-500">{m.hint}</div>
            </div>
          ))}
        </section>
      )}

      <section className="va-card space-y-2 text-sm">
        <div className="font-medium">扫码方法</div>
        <ol className="list-decimal list-inside space-y-1 text-ink-600 text-xs sm:text-sm leading-relaxed">
          <li>
            <strong>手机</strong>：长按上面的二维码 → 选择「识别图中二维码」
          </li>
          <li>
            <strong>电脑</strong>：用手机微信/支付宝的「扫一扫」对着屏幕扫
          </li>
          <li>
            或者<strong>截图保存</strong>，再从相册里选「扫一扫 → 相册」
          </li>
        </ol>
      </section>

      <section className="va-card text-sm space-y-2">
        <div className="font-medium">想帮忙但不想花钱？</div>
        <ul className="space-y-1 text-ink-600 text-xs sm:text-sm">
          <li>• 把这个应用分享给正在备考的朋友</li>
          <li>• 发现 bug 或想加功能，直接跟作者说</li>
          <li>• 坚持每天学一点，就是最好的支持 🙌</li>
        </ul>
      </section>
    </div>
  )
}
