import { useState } from 'react'
import { speakText } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'
import {
  ANGLES, LINKERS, PITFALLS, SENTENCE_GROUPS, STRUCTURE, UPGRADES,
} from './toolkit'

type Tab = 'sentence' | 'linker' | 'upgrade' | 'angle' | 'structure' | 'pitfall'

const TABS: [Tab, string][] = [
  ['sentence', '🧩 模板句型'],
  ['linker', '🔗 连接词'],
  ['upgrade', '⬆️ 高分替换'],
  ['angle', '🎯 论证角度'],
  ['structure', '📐 段落结构'],
  ['pitfall', '⚠️ 常见扣分'],
]

/** 写作素材库：模板、连接词、高分替换、论证角度、结构、扣分点 */
export function WritingToolkit() {
  const [tab, setTab] = useState<Tab>('sentence')

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              setTab(k)
              trackEvent('writing_toolkit', k)
            }}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border shrink-0 transition-colors ${
              tab === k
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white border-ink-100 text-ink-600 hover:border-ink-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sentence' && <Sentences />}
      {tab === 'linker' && <Linkers />}
      {tab === 'upgrade' && <Upgrades />}
      {tab === 'angle' && <Angles />}
      {tab === 'structure' && <StructureBlock />}
      {tab === 'pitfall' && <Pitfalls />}
    </div>
  )
}

/** 可发音 + 可复制的英文句子 */
function En({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className={`flex items-start gap-1.5 ${className}`}>
      <button
        onClick={() => speakText(text)}
        className="text-xs shrink-0 mt-0.5 opacity-60 hover:opacity-100"
        title="朗读"
      >
        🔊
      </button>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(text).catch(() => {})
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        }}
        className="text-left flex-1 font-mono text-[13px] leading-relaxed hover:text-accent-deep"
        title="点击复制"
      >
        {text}
        {copied && <span className="ml-1.5 text-[10px] text-green-600">已复制</span>}
      </button>
    </div>
  )
}

function Sentences() {
  const [open, setOpen] = useState<string>(SENTENCE_GROUPS[0].title)
  return (
    <div className="space-y-2">
      {SENTENCE_GROUPS.map((g) => {
        const active = open === g.title
        return (
          <section key={g.title} className="va-card !p-0 overflow-hidden">
            <button
              onClick={() => setOpen(active ? '' : g.title)}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
            >
              <span className="text-lg">{g.emoji}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{g.title}</span>
                <span className="block text-[11px] text-ink-500">{g.desc}</span>
              </span>
              <span className={`text-ink-400 transition-transform ${active ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {active && (
              <div className="px-4 pb-3.5 space-y-3 border-t border-ink-100 pt-3">
                {g.items.map((it, i) => (
                  <div key={i} className="space-y-0.5">
                    <En text={it.en} />
                    <div className="text-xs text-ink-600 pl-6 flex items-center gap-2">
                      <span>{it.zh}</span>
                      {it.note && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-deep">
                          {it.note}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function Linkers() {
  return (
    <div className="space-y-2">
      <div className="text-xs text-ink-500 leading-relaxed">
        左边是大多数人写的，右边是**能加分**的。同一篇文章里别重复用同一个。
      </div>
      {LINKERS.map((l) => (
        <section key={l.type} className="va-card space-y-2">
          <div className="text-sm font-semibold">
            {l.emoji} {l.type}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {l.basic.map((b) => (
              <span key={b} className="text-[11px] px-2 py-1 rounded bg-ink-100 text-ink-500 line-through">
                {b}
              </span>
            ))}
            {l.better.map((b) => (
              <button
                key={b}
                onClick={() => speakText(b.replace('...', ''))}
                className="text-[11px] px-2 py-1 rounded bg-accent-soft text-accent-deep active:opacity-70"
                title="点击朗读"
              >
                {b}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Upgrades() {
  const [q, setQ] = useState('')
  const list = UPGRADES.filter(
    (u) => !q || u.basic.includes(q.toLowerCase()) || u.better.some((b) => b.includes(q.toLowerCase())),
  )
  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜一个你想替换的简单词，比如 important"
        className="w-full px-3.5 py-2.5 bg-white border border-ink-100 rounded-xl text-sm focus:outline-none focus:border-ink-900"
      />
      <div className="space-y-2">
        {list.map((u) => (
          <div key={u.basic} className="va-card !p-3 space-y-1.5">
            <div className="text-xs text-ink-400 line-through">{u.basic}</div>
            <div className="flex flex-wrap gap-1.5">
              {u.better.map((b) => (
                <button
                  key={b}
                  onClick={() => speakText(b)}
                  className="text-xs px-2 py-1 rounded-lg bg-ink-50 hover:bg-ink-900 hover:text-white transition-colors"
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-sm text-ink-500 text-center py-8">没找到，换个词试试</div>
        )}
      </div>
    </div>
  )
}

function Angles() {
  return (
    <div className="space-y-2">
      <div className="text-xs text-ink-500 leading-relaxed">
        拿到题目不知道写什么？按这六个角度各问一遍，论点自然就出来了。
        一篇文章挑<strong>两个角度</strong>展开就够。
      </div>
      {ANGLES.map((a) => (
        <section key={a.name} className="va-card space-y-1.5">
          <div className="text-sm font-semibold">
            {a.emoji} {a.name}
          </div>
          <div className="text-[11px] text-ink-500">{a.desc}</div>
          <ul className="space-y-1 pt-1">
            {a.questions.map((q2) => (
              <li key={q2} className="text-xs text-ink-700 flex gap-1.5">
                <span className="text-ink-300">·</span>
                {q2}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function StructureBlock() {
  const [which, setWhich] = useState<'ielts' | 'toefl'>('ielts')
  const s = STRUCTURE[which]
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {(['ielts', 'toefl'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setWhich(k)}
            className={`px-3 py-1.5 rounded-lg text-xs border ${
              which === k ? 'bg-ink-900 text-white border-ink-900' : 'border-ink-100 text-ink-600'
            }`}
          >
            {k === 'ielts' ? '雅思 Task 2' : '托福独立写作'}
          </button>
        ))}
      </div>
      <div className="text-sm font-semibold">{s.name}</div>
      <div className="va-card !p-0 overflow-hidden divide-y divide-ink-100">
        {s.parts.map((p) => (
          <div key={p.part} className="px-4 py-3 space-y-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{p.part}</span>
              <span className="text-[11px] text-ink-500 tabular-nums shrink-0">
                {p.words !== '—' && `${p.words} 词 · `}
                {p.time}
              </span>
            </div>
            <div className="text-[11px] text-ink-500 leading-relaxed">{p.tip}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Pitfalls() {
  return (
    <div className="space-y-2">
      <div className="text-xs text-ink-500 leading-relaxed">
        这些是最常见的扣分点，写完后按这个表自查一遍。
      </div>
      {PITFALLS.map((p, i) => (
        <section key={i} className="va-card !p-3 space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <span className="text-red-500 shrink-0 mt-0.5">✕</span>
            <span className="font-mono text-red-600 line-through">{p.bad}</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <span className="text-green-600 shrink-0 mt-0.5">✓</span>
            <span className="font-mono text-green-700">{p.good}</span>
          </div>
          <div className="text-[11px] text-ink-500 pl-5">{p.why}</div>
        </section>
      ))}
    </div>
  )
}
