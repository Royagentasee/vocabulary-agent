import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLearnStore, QUESTION_KIND_LABEL } from '@/stores/learnStore'
import { trackEvent } from '@/services/stats'

type Tab = 'words' | 'questions'

export function WrongbookPage() {
  useEffect(() => {
    trackEvent('wrongbook_open')
  }, [])

  const {
    wrongWords, removeWrongWord, clearWrongWords, startReviewWrongWords,
    wrongQuestions, removeWrongQuestion, clearWrongQuestions,
  } = useLearnStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('words')
  const [openId, setOpenId] = useState('')

  const handleReviewWrong = () => {
    startReviewWrongWords()
    navigate('/review')
  }

  const qList = (wrongQuestions || []).slice().sort((a, b) => b.wrongCount - a.wrongCount)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">错题本</h1>
          <p className="text-ink-500 mt-1 text-sm">答错的单词和题目都在这里，及时复习巩固</p>
        </div>
        {tab === 'words' && wrongWords.length > 0 && (
          <div className="flex gap-2 shrink-0">
            <button onClick={handleReviewWrong} className="va-btn va-btn--primary va-btn--sm">
              📖 重做错词
            </button>
            <button
              onClick={() => {
                if (confirm('确定清空错词？')) clearWrongWords()
              }}
              className="va-btn va-btn--secondary va-btn--sm"
            >
              清空
            </button>
          </div>
        )}
        {tab === 'questions' && qList.length > 0 && (
          <button
            onClick={() => {
              if (confirm('确定清空错题？')) clearWrongQuestions()
            }}
            className="va-btn va-btn--secondary va-btn--sm shrink-0"
          >
            清空
          </button>
        )}
      </header>

      {/* 标签页 */}
      <div className="flex gap-1.5">
        {([
          ['words', `📖 错词 ${wrongWords.length}`],
          ['questions', `📝 错题 ${qList.length}`],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 rounded-lg text-xs border transition-colors ${
              tab === k
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white border-ink-100 text-ink-600 hover:border-ink-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ============ 错词 ============ */}
      {tab === 'words' && (
        wrongWords.length === 0 ? (
          <div className="va-card text-center py-16 space-y-4">
            <div className="text-5xl">✨</div>
            <h2 className="text-lg font-semibold">还没有错词</h2>
            <p className="text-ink-500 text-sm">
              学习、路径测验、智能课程里答错的单词会自动记录到这里
            </p>
            <Link to="/wordbooks" className="va-btn va-btn--primary va-btn--md inline-block">
              去学新词
            </Link>
          </div>
        ) : (
          <>
            <div className="text-sm text-ink-500">共 {wrongWords.length} 个错词</div>
            <div className="space-y-2">
              {wrongWords
                .slice()
                .sort((a, b) => b.wrongCount - a.wrongCount)
                .map((w) => (
                  <div key={w.word.id} className="va-card flex items-center justify-between py-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-ink-50 flex items-center justify-center shrink-0">
                        <span className="font-mono font-semibold text-lg">
                          {w.word.headword.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-lg">{w.word.headword}</span>
                          <span className="text-sm text-ink-500 font-mono">{w.word.ipa}</span>
                        </div>
                        <div className="text-sm text-ink-500 mt-1">
                          {w.word.senses.map((s) => s.definitionCn).join('；')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-ink-500">
                        错 <span className="text-red-500 font-semibold">{w.wrongCount}</span> 次
                      </span>
                      <button
                        onClick={() => removeWrongWord(w.word.id)}
                        className="text-xs text-ink-500 hover:text-red-500 transition-colors"
                        title="已掌握，移出错题本"
                      >
                        ✓ 掌握
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )
      )}

      {/* ============ 错题 ============ */}
      {tab === 'questions' && (
        qList.length === 0 ? (
          <div className="va-card text-center py-16 space-y-4">
            <div className="text-5xl">📝</div>
            <h2 className="text-lg font-semibold">还没有错题</h2>
            <p className="text-ink-500 text-sm">
              分级阅读、语法、听力里答错的题目会自动记录到这里
            </p>
            <div className="flex justify-center gap-2">
              <Link to="/reading" className="va-btn va-btn--secondary va-btn--md">
                去阅读
              </Link>
              <Link to="/grammar" className="va-btn va-btn--secondary va-btn--md">
                去练语法
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm text-ink-500">共 {qList.length} 道错题</div>
            <div className="space-y-2">
              {qList.map((q) => {
                const open = openId === q.id
                return (
                  <div key={q.id} className="va-card !p-0 overflow-hidden">
                    <button
                      onClick={() => setOpenId(open ? '' : q.id)}
                      className="w-full text-left px-4 py-3.5 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">
                          {QUESTION_KIND_LABEL[q.kind]}
                        </span>
                        {q.context && (
                          <span className="text-[11px] text-ink-400 truncate max-w-[60%]">
                            {q.context}
                          </span>
                        )}
                        <span className="text-[11px] text-red-500 ml-auto shrink-0">
                          错 {q.wrongCount} 次
                        </span>
                      </div>
                      <div className="text-sm font-medium leading-relaxed">{q.question}</div>
                      {!open && (
                        <div className="text-xs text-ink-400">
                          你的答案：
                          <span className="text-red-500 line-through">{q.chosen || '（未选）'}</span>
                        </div>
                      )}
                    </button>

                    {open && (
                      <div className="px-4 pb-4 space-y-3 border-t border-ink-100 pt-3">
                        <div className="space-y-1.5">
                          {q.options.map((opt) => {
                            const isCorrect = opt === q.correct
                            const isChosen = opt === q.chosen
                            return (
                              <div
                                key={opt}
                                className={`text-sm px-3 py-2 rounded-lg border ${
                                  isCorrect
                                    ? 'border-green-300 bg-green-50 text-green-800'
                                    : isChosen
                                    ? 'border-red-200 bg-red-50 text-red-700'
                                    : 'border-ink-100 text-ink-600'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="flex-1">{opt}</span>
                                  {isCorrect && <span className="text-xs">正确 ✓</span>}
                                  {isChosen && !isCorrect && <span className="text-xs">你选的</span>}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                        {q.explain && (
                          <div className="text-xs text-ink-600 leading-relaxed bg-ink-50 rounded-lg px-3 py-2">
                            💡 {q.explain}
                          </div>
                        )}
                        <div className="flex justify-end">
                          <button
                            onClick={() => removeWrongQuestion(q.id)}
                            className="text-xs text-ink-400 hover:text-green-600"
                          >
                            ✓ 已掌握，移除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )
      )}
    </div>
  )
}
