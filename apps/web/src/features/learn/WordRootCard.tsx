import type { RootAffix } from '@vocab-agent/types'

interface Props {
  rootAffix?: RootAffix | null
  className?: string
}

/** 词根词缀拆解卡片（学习卡片 / 解释面板共用） */
export function WordRootCard({ rootAffix, className = '' }: Props) {
  if (!rootAffix) return null
  const { prefix, prefixMeaning, root, rootMeaning, suffix, suffixMeaning } = rootAffix
  if (!prefix && !root && !suffix) return null

  return (
    <div className={`bg-white/70 border border-ink-100 rounded-xl p-3 ${className}`}>
      <div className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
        🔤 词根词缀
      </div>
      <div className="space-y-1.5">
        {prefix && <AffixRow label="前缀" affix={prefix} meaning={prefixMeaning} color="text-blue-600" />}
        {root && <AffixRow label="词根" affix={root} meaning={rootMeaning} color="text-accent-deep" />}
        {suffix && <AffixRow label="后缀" affix={suffix} meaning={suffixMeaning} color="text-purple-600" />}
      </div>
    </div>
  )
}

function AffixRow({
  label,
  affix,
  meaning,
  color,
}: {
  label: string
  affix: string
  meaning?: string
  color: string
}) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-xs text-ink-500 w-8 shrink-0">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{affix}</span>
      {meaning && <span className="text-ink-500">— {meaning}</span>}
    </div>
  )
}
