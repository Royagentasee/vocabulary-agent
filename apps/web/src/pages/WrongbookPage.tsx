import { Link, useNavigate } from 'react-router-dom'
import { useLearnStore } from '@/stores/learnStore'

export function WrongbookPage() {
  const { wrongWords, removeWrongWord, clearWrongWords, startReviewWrongWords } = useLearnStore()
  const navigate = useNavigate()

  const handleReviewWrong = () => {
    startReviewWrongWords()
    navigate('/review')
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">错题本</h1>
          <p className="text-ink-500 mt-1 text-sm">答错的单词都在这里，及时复习巩固</p>
        </div>
        {wrongWords.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleReviewWrong}
              className="va-btn va-btn--primary va-btn--sm"
            >
              📖 重做错词
            </button>
            <button
              onClick={() => {
                if (confirm('确定清空错题本？')) clearWrongWords()
              }}
              className="va-btn va-btn--secondary va-btn--sm"
            >
              清空
            </button>
          </div>
        )}
      </header>

      {wrongWords.length === 0 ? (
        <div className="va-card text-center py-16 space-y-4">
          <div className="text-5xl">✨</div>
          <h2 className="text-lg font-semibold">错题本是空的</h2>
          <p className="text-ink-500 text-sm">学习时答错的单词会自动记录到这里</p>
          <Link to="/wordbooks" className="va-btn va-btn--primary va-btn--md inline-block">
            去学新词
          </Link>
        </div>
      ) : (
        <>
          <div className="text-sm text-ink-500">
            共 {wrongWords.length} 个错词
          </div>

          <div className="space-y-2">
            {wrongWords
              .slice()
              .sort((a, b) => b.wrongCount - a.wrongCount)
              .map((w) => (
                <div
                  key={w.word.id}
                  className="va-card flex items-center justify-between py-4"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-ink-50 flex items-center justify-center">
                      <span className="font-mono font-semibold text-lg">
                        {w.word.headword.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">{w.word.headword}</span>
                        <span className="text-sm text-ink-500 font-mono">{w.word.ipa}</span>
                      </div>
                      <div className="text-sm text-ink-500 mt-1">
                        {w.word.senses.map((s) => s.definitionCn).join('；')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
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
      )}
    </div>
  )
}
