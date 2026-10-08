import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PATH_UNITS,
  PathLesson,
  PathUnit,
  usePathStore,
  isUnlocked,
  isUnitDone,
  currentLesson,
  pathPercent,
} from '@/stores/pathStore'
import { fetchMeaningQuizBatch, MeaningQuiz } from '@/services/words'
import { speakText } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

export function PathPage() {
  const nav = useNavigate()
  const { progress, reportActivity } = usePathStore()
  const [quizUnit, setQuizUnit] = useState<PathUnit | null>(null)

  const cur = currentLesson(progress)
  const pct = pathPercent(progress)
  // 订阅一下进度变化，保证 reportActivity 后界面刷新
  void reportActivity

  if (quizUnit) {
    return (
      <Checkpoint
        unit={quizUnit}
        onExit={() => setQuizUnit(null)}
        onPass={() => {
          const cp = quizUnit.lessons.find((l) => l.type === 'checkpoint')
          if (cp) usePathStore.getState().completeLesson(cp.id)
          setQuizUnit(null)
          nav('/path')
        }}
      />
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">🗺️ 学习路径</h1>
        <p className="text-ink-500 text-sm">
          跟着走就行，不用想今天学什么
        </p>
      </header>

      {/* 总进度 + 继续 */}
      <section className="va-card space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">总进度</span>
          <span className="text-ink-500 tabular-nums">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {cur ? (
          <button
            onClick={() => {
              trackEvent('path_continue', cur.id)
              nav(cur.route)
            }}
            className="w-full py-3 rounded-xl bg-ink-900 text-white text-sm font-medium active:opacity-80 flex items-center justify-center gap-2"
          >
            <span>{cur.emoji}</span>
            继续「{cur.title}」
          </button>
        ) : (
          <div className="text-center text-sm text-green-700 bg-green-50 rounded-xl py-3">
            🎉 全部课程已完成，你太强了！
          </div>
        )}
      </section>

      {/* 单元列表 */}
      <div className="space-y-3">
        {PATH_UNITS.map((u, idx) => (
          <UnitCard
            key={u.id}
            unit={u}
            index={idx}
            progress={progress}
            onStart={() => {
              const first = u.lessons.find(
                (l) => (progress[l.id] || 0) < l.target && isUnlocked(l.id, progress),
              )
              if (!first) return
              if (first.type === 'checkpoint') setQuizUnit(u)
              else nav(first.route)
            }}
            onCheckpoint={() => setQuizUnit(u)}
          />
        ))}
      </div>

      <section className="va-card text-xs text-ink-500 space-y-1.5">
        <div className="text-sm font-semibold text-ink-700">怎么算完成</div>
        <ul className="space-y-1 leading-relaxed">
          <li>• 课程按真实使用自动记账 —— 你在对应页面做了就算，不用手动打勾</li>
          <li>• 完成一课才解锁下一课；完成整个单元才能进入下一单元</li>
          <li>• 单元测验 20 道词义题，答对 14 道以上算通过</li>
        </ul>
      </section>
    </div>
  )
}

/* ============ 单元卡片 ============ */

function UnitCard({
  unit,
  index,
  progress,
  onStart,
  onCheckpoint,
}: {
  unit: PathUnit
  index: number
  progress: Record<string, number>
  onStart: () => void
  onCheckpoint: () => void
}) {
  const done = isUnitDone(unit, progress)
  const started = unit.lessons.some((l) => (progress[l.id] || 0) > 0 || isUnlocked(l.id, progress))
  const locked = !started && !done

  const doneCount = unit.lessons.filter((l) => (progress[l.id] || 0) >= l.target).length

  return (
    <section
      className={`va-card space-y-3 ${
        done ? 'border-green-200 bg-green-50/30' : locked ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-b ${unit.color} flex items-center justify-center text-white font-semibold shrink-0`}
          >
            {done ? '✓' : locked ? '🔒' : index + 1}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold flex items-center gap-2">
              {unit.title}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">
                {unit.level}
              </span>
            </div>
            <div className="text-xs text-ink-500 truncate">{unit.subtitle}</div>
          </div>
        </div>
        <div className="text-xs text-ink-400 shrink-0 tabular-nums">
          {doneCount}/{unit.lessons.length}
        </div>
      </div>

      {/* 课程列表 */}
      <div className="space-y-1.5">
        {unit.lessons.map((l) => (
          <LessonRow
            key={l.id}
            lesson={l}
            progress={progress[l.id] || 0}
            unlocked={isUnlocked(l.id, progress)}
            onCheckpoint={onCheckpoint}
          />
        ))}
      </div>

      {!done && started && (
        <button
          onClick={onStart}
          className="w-full py-2 rounded-lg bg-ink-900 text-white text-xs font-medium active:opacity-80"
        >
          继续这一单元
        </button>
      )}
    </section>
  )
}

function LessonRow({
  lesson,
  progress,
  unlocked,
  onCheckpoint,
}: {
  lesson: PathLesson
  progress: number
  unlocked: boolean
  onCheckpoint: () => void
}) {
  const nav = useNavigate()
  const done = progress >= lesson.target
  const active = unlocked && !done

  const handle = () => {
    if (!unlocked || done) return
    trackEvent('path_lesson', lesson.id)
    if (lesson.type === 'checkpoint') onCheckpoint()
    else nav(lesson.route)
  }

  return (
    <button
      onClick={handle}
      disabled={!unlocked || done}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
        done
          ? 'bg-green-50 text-green-800'
          : active
          ? 'bg-ink-50 text-ink-800 active:bg-ink-100'
          : 'bg-ink-50/50 text-ink-400'
      }`}
    >
      <span className={`text-base ${done || active ? '' : 'opacity-40'}`}>
        {done ? '✅' : unlocked ? lesson.emoji : '🔒'}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block truncate">{lesson.title}</span>
        {!done && unlocked && (
          <span className="block text-[11px] text-ink-400 truncate">{lesson.desc}</span>
        )}
      </span>
      {!done && unlocked && lesson.target > 1 && (
        <span className="text-[11px] text-ink-500 tabular-nums shrink-0">
          {progress}/{lesson.target}
        </span>
      )}
      {active && <span className="text-ink-300 shrink-0">›</span>}
    </button>
  )
}

/* ============ 单元测验 ============ */

function Checkpoint({
  unit,
  onExit,
  onPass,
}: {
  unit: PathUnit
  onExit: () => void
  onPass: () => void
}) {
  const [quizzes, setQuizzes] = useState<MeaningQuiz[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const PASS = 14
  const TOTAL = 20

  useEffect(() => {
    setLoading(true)
    fetchMeaningQuizBatch(TOTAL)
      .then((qs) => {
        if (qs.length < 5) setError('题目不够，稍后再试')
        setQuizzes(qs)
      })
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [])

  const q = quizzes[index]
  const finished = quizzes.length > 0 && index >= quizzes.length
  const passed = correct >= PASS

  const choose = (label: string) => {
    if (selected) return
    setSelected(label)
    if (label === q.correct_label) setCorrect((c) => c + 1)
  }

  const next = () => {
    setSelected(null)
    setIndex((i) => i + 1)
  }

  if (loading) {
    return <div className="text-sm text-ink-500 py-16 text-center">正在出题…</div>
  }

  if (error) {
    return (
      <div className="space-y-3 max-w-2xl">
        <button onClick={onExit} className="text-sm text-ink-500">
          ← 返回路径
        </button>
        <div className="va-card text-sm text-red-600">{error}</div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="va-card text-center space-y-3 py-8">
          <div className="text-5xl">{passed ? '🎉' : '💪'}</div>
          <div className="text-2xl font-semibold">
            {correct} / {quizzes.length}
          </div>
          <div className="text-sm text-ink-500">
            {passed ? `通过！单元「${unit.title}」完成` : `答对 ${PASS} 道以上即可通过，再来一次？`}
          </div>
          <div className="flex gap-2 justify-center pt-2">
            {passed ? (
              <button onClick={onPass} className="va-btn va-btn--primary va-btn--md">
                继续下一单元
              </button>
            ) : (
              <button
                onClick={() => {
                  setIndex(0)
                  setCorrect(0)
                  setSelected(null)
                  setLoading(true)
                  fetchMeaningQuizBatch(TOTAL)
                    .then(setQuizzes)
                    .finally(() => setLoading(false))
                }}
                className="va-btn va-btn--primary va-btn--md"
              >
                再考一次
              </button>
            )}
            <button onClick={onExit} className="va-btn va-btn--secondary va-btn--md">
              返回路径
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm text-ink-500 hover:text-ink-900">
          ← 退出测验
        </button>
        <div className="text-xs text-ink-500 tabular-nums">
          {index + 1} / {quizzes.length} · 已对 {correct}
        </div>
      </div>

      <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-ink-900 transition-all"
          style={{ width: `${(index / quizzes.length) * 100}%` }}
        />
      </div>

      <div className="va-card space-y-4">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-semibold">{q.headword}</span>
            <button
              onClick={() => speakText(q.headword)}
              className="w-8 h-8 rounded-full bg-ink-50 hover:bg-ink-900 hover:text-white flex items-center justify-center text-sm"
            >
              🔊
            </button>
          </div>
          {q.ipa && <div className="text-xs text-ink-500 font-mono">/{q.ipa}/</div>}
          {q.pos.length > 0 && (
            <div className="text-xs text-ink-400">{q.pos.join(' · ')}</div>
          )}
          <div className="text-sm text-ink-500 pt-1">选出正确的中文意思</div>
        </div>

        <div className="space-y-2">
          {q.choices.map((c) => {
            const isRight = c.label === q.correct_label
            const picked = selected === c.label
            return (
              <button
                key={c.label}
                disabled={!!selected}
                onClick={() => choose(c.label)}
                className={`w-full text-left text-sm px-3 py-2.5 rounded-lg border transition-colors flex gap-2 ${
                  !selected
                    ? 'border-ink-100 hover:border-ink-900 active:bg-ink-50'
                    : isRight
                    ? 'border-green-400 bg-green-50 text-green-800'
                    : picked
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-ink-100 text-ink-400'
                }`}
              >
                <span className="font-medium shrink-0">{c.label}.</span>
                <span className="flex-1">{c.text}</span>
                {selected && isRight && <span>✓</span>}
                {selected && picked && !isRight && <span>✕</span>}
              </button>
            )
          })}
        </div>

        {selected && (
          <button onClick={next} className="va-btn va-btn--primary va-btn--md w-full">
            {index + 1 >= quizzes.length ? '看结果' : '下一题'}
          </button>
        )}
      </div>
    </div>
  )
}
