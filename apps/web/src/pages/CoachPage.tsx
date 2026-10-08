import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { coachChat, CoachMessage, CoachAction, QUICK_ASKS } from '@/services/coach'
import { useLearnStore } from '@/stores/learnStore'
import { usePlanStore, currentStreak, daysUntil, EXAM_LABEL, todayKey } from '@/stores/planStore'
import { usePointsStore } from '@/stores/pointsStore'
import { usePathStore, PATH_UNITS, pathPercent } from '@/stores/pathStore'
import { QuotaBadge } from '@/components/Quota'
import { trackEvent } from '@/services/stats'

/** 把本地学习数据整理成给教练看的上下文 */
function buildContext() {
  const learn = useLearnStore.getState()
  const plan = usePlanStore.getState()
  const pts = usePointsStore.getState()
  const path = usePathStore.getState()

  const totalLessons = PATH_UNITS.reduce((a, u) => a + u.lessons.length, 0)
  const doneLessons = PATH_UNITS.reduce(
    (a, u) => a + u.lessons.filter((l) => (path.progress[l.id] || 0) >= l.target).length,
    0,
  )

  return {
    learnedCount: learn.learnedWords.length,
    wrongCount: learn.wrongWords.length,
    streak: currentStreak(plan.checkinDates),
    checkinDays: new Set(plan.checkinDates).size,
    points: pts.balance,
    isMember: pts.isMember(),
    examType: plan.examType ? EXAM_LABEL[plan.examType] || plan.examType : '',
    examDate: plan.examDate,
    daysLeft: daysUntil(plan.examDate),
    targetScore: plan.targetScore,
    dailyGoal: learn.dailyGoal,
    todayLearned: learn.todayLearned,
    todayReviewed: learn.todayReviewed,
    pathProgress: `${doneLessons}/${totalLessons} 课（${pathPercent(path.progress)}%）`,
    recentModules: Object.keys(plan.taskDone[todayKey()] || {}).join('、'),
    todayTasks: (plan.taskDone[todayKey()] || []).length,
  }
}

export function CoachPage() {
  const nav = useNavigate()
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    trackEvent('coach_view')
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const send = async (text?: string) => {
    const t = (text ?? input).trim()
    if (!t || sending) return
    setInput('')
    setError('')

    const next: CoachMessage[] = [...messages, { role: 'user', content: t }]
    setMessages(next)
    setSending(true)

    try {
      const r = await coachChat(next, buildContext())
      setMessages([...next, { role: 'assistant', content: r.reply }])
      trackEvent('coach_chat')
      // 执行教练给的动作
      for (const a of r.actions || []) applyAction(a, nav)
    } catch (e: any) {
      setError(e?.message || '发送失败')
      setMessages(next)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
          🧠 AI 学习教练
          <QuotaBadge feature="coach" className="align-middle" />
        </h1>
        <p className="text-ink-500 text-sm">
          它能看到你的学习数据，给的建议都是具体的
        </p>
      </header>

      {/* 数据概览（教练看到的） */}
      <ContextStrip />

      {/* 聊天区 */}
      {messages.length === 0 ? (
        <section className="va-card space-y-3">
          <div className="text-sm text-ink-600">
            👋 我是你的学习教练。可以问我备考规划、学习方法，或者直接说
            「帮我看下数据」。
          </div>
          <div className="space-y-1.5">
            {QUICK_ASKS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="w-full text-left text-sm px-3 py-2.5 rounded-lg bg-ink-50 hover:bg-ink-100 active:bg-ink-100 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-ink-900 text-white rounded-br-sm'
                    : 'bg-white border border-ink-100 text-ink-800 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="text-sm text-ink-500 bg-white border border-ink-100 rounded-2xl px-3.5 py-2.5">
                教练正在想…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* 输入区 */}
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="问点什么，比如「我该怎么安排学习」"
          className="flex-1 px-3.5 py-2.5 bg-white border border-ink-100 rounded-xl text-sm focus:outline-none focus:border-ink-900"
        />
        <button
          onClick={() => send()}
          disabled={sending || !input.trim()}
          className="px-4 py-2.5 bg-ink-900 text-white rounded-xl text-sm disabled:opacity-40 shrink-0"
        >
          发送
        </button>
      </div>

      {messages.length > 0 && (
        <button
          onClick={() => setMessages([])}
          className="text-xs text-ink-400 hover:text-ink-700 w-full text-center"
        >
          清空对话
        </button>
      )}
    </div>
  )
}

/** 教练能看到的数据（也顺便让用户确认） */
function ContextStrip() {
  const learn = useLearnStore()
  const plan = usePlanStore()
  const pts = usePointsStore()

  const streak = currentStreak(plan.checkinDates)
  const left = daysUntil(plan.examDate)

  const items = [
    { label: '已学词', value: learn.learnedWords.length },
    { label: '连续打卡', value: `${streak} 天` },
    { label: '错题本', value: learn.wrongWords.length },
    { label: '积分', value: pts.balance },
  ]

  return (
    <section className="va-card space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500">教练能看到你的这些数据</div>
        {plan.examDate && left !== null && (
          <div className="text-xs text-accent-deep">
            距{EXAM_LABEL[plan.examType] || '考试'} {left} 天
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {items.map((it) => (
          <div key={it.label} className="bg-ink-50 rounded-lg py-2">
            <div className="text-base font-semibold tabular-nums">{it.value}</div>
            <div className="text-[10px] text-ink-500">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** 执行教练给出的动作 */
function applyAction(a: CoachAction, nav: (p: string) => void) {
  try {
    if (a.type === 'set_exam' && a.date) {
      usePlanStore.getState().setExam({
        type: (a.examType as any) || 'OTHER',
        date: a.date,
        target: a.target || '',
      })
    } else if (a.type === 'set_daily_goal' && a.value) {
      useLearnStore.getState().setDailyGoal(a.value)
    } else if (a.type === 'goto' && a.route) {
      nav(a.route)
    }
  } catch {
    /* ignore */
  }
}
