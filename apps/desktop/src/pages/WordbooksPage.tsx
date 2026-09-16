import { useNavigate } from 'react-router-dom'
import { MOCK_WORDBOOKS } from '@/services/words'
import { useLearnStore } from '@/stores/learnStore'

export function WordbooksPage() {
  const navigate = useNavigate()
  const { setWordbook, startReview } = useLearnStore()

  const handleSelect = async (id: string) => {
    setWordbook(id)
    await startReview()
    navigate('/review')
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold">选择词书</h1>
        <p className="text-ink-500 mt-1 text-sm">选好后即可开始今日复习</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MOCK_WORDBOOKS.map((wb) => (
          <button
            key={wb.id}
            onClick={() => handleSelect(wb.id)}
            className="va-card text-left hover:border-ink-900 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg mb-3" style={{ backgroundColor: wb.coverColor }} />
            <div className="font-semibold">{wb.name}</div>
            <div className="text-sm text-ink-500 mt-1">{wb.description}</div>
            <div className="text-xs text-ink-500 mt-3">
              {wb.wordCount.toLocaleString()} 词 · {wb.examTag}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}