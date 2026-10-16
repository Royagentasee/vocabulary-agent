/**
 * 成就徽章
 *
 * 全部由本地数据计算，不需要后端。
 * 每个徽章给出 (当前值, 目标值)，未解锁时显示进度条。
 */

export interface BadgeContext {
  learned: number          // 累计已学单词
  wrongCount: number       // 错题本词数
  streak: number           // 当前连续打卡
  longest: number          // 最长连续打卡
  checkinDays: number      // 累计打卡天数
  lifetime: Record<string, number>   // 各行为累计次数
  pathUnitsDone: number    // 已完成的路径单元数
  wordCount: number        // 已学词的去重数量（= learned，占位便于扩展）
}

export interface Badge {
  id: string
  name: string
  desc: string
  emoji: string
  tier: 'bronze' | 'silver' | 'gold'
  /** 返回 [当前, 目标] */
  progress: (c: BadgeContext) => [number, number]
}

const p = (cur: number, target: number): [number, number] => [Math.min(cur, target), target]

export const BADGES: Badge[] = [
  // —— 词汇量 ——
  { id: 'w1', name: '第一步', emoji: '👣', tier: 'bronze', desc: '学完第 1 个单词',
    progress: (c) => p(c.learned, 1) },
  { id: 'w50', name: '小有所成', emoji: '🌱', tier: 'bronze', desc: '累计学会 50 个词',
    progress: (c) => p(c.learned, 50) },
  { id: 'w200', name: '词汇起步', emoji: '📗', tier: 'silver', desc: '累计学会 200 个词',
    progress: (c) => p(c.learned, 200) },
  { id: 'w500', name: '词汇达人', emoji: '📚', tier: 'silver', desc: '累计学会 500 个词',
    progress: (c) => p(c.learned, 500) },
  { id: 'w1000', name: '千词斩', emoji: '👑', tier: 'gold', desc: '累计学会 1000 个词',
    progress: (c) => p(c.learned, 1000) },
  { id: 'w3000', name: '词汇之王', emoji: '🏰', tier: 'gold', desc: '累计学会 3000 个词',
    progress: (c) => p(c.learned, 3000) },

  // —— 坚持 ——
  { id: 's3', name: '三天热度', emoji: '🔥', tier: 'bronze', desc: '连续打卡 3 天',
    progress: (c) => p(c.streak, 3) },
  { id: 's7', name: '一周不断', emoji: '🗓️', tier: 'silver', desc: '连续打卡 7 天',
    progress: (c) => p(c.streak, 7) },
  { id: 's30', name: '月度铁人', emoji: '🏆', tier: 'gold', desc: '连续打卡 30 天',
    progress: (c) => p(c.streak, 30) },
  { id: 's100', name: '百日筑基', emoji: '💎', tier: 'gold', desc: '累计打卡 100 天',
    progress: (c) => p(c.checkinDays, 100) },

  // —— 听力 ——
  { id: 'l10', name: '听力入门', emoji: '🎧', tier: 'bronze', desc: '完成 10 篇听力',
    progress: (c) => p(c.lifetime.listening || 0, 10) },
  { id: 'l50', name: '耳朵磨出来', emoji: '👂', tier: 'silver', desc: '完成 50 篇听力',
    progress: (c) => p(c.lifetime.listening || 0, 50) },
  { id: 'l200', name: '听力狂人', emoji: '🎼', tier: 'gold', desc: '完成 200 篇听力',
    progress: (c) => p(c.lifetime.listening || 0, 200) },

  // —— 口语 ——
  { id: 'sp10', name: '开口说话', emoji: '🎙️', tier: 'bronze', desc: '口语跟读 10 次',
    progress: (c) => p(c.lifetime.speaking || 0, 10) },
  { id: 'sp50', name: '口齿清晰', emoji: '🗣️', tier: 'silver', desc: '口语跟读 50 次',
    progress: (c) => p(c.lifetime.speaking || 0, 50) },

  // —— 对话 ——
  { id: 'd20', name: '敢于接话', emoji: '💬', tier: 'silver', desc: '对话 20 轮',
    progress: (c) => p(c.lifetime.dialogue || 0, 20) },
  { id: 'd100', name: '交流自如', emoji: '🤝', tier: 'gold', desc: '对话 100 轮',
    progress: (c) => p(c.lifetime.dialogue || 0, 100) },

  // —— 阅读 ——
  { id: 'r10', name: '阅读者', emoji: '📖', tier: 'bronze', desc: '读完 10 篇文章',
    progress: (c) => p(c.lifetime.reading || 0, 10) },
  { id: 'r50', name: '博览群书', emoji: '🦉', tier: 'gold', desc: '读完 50 篇文章',
    progress: (c) => p(c.lifetime.reading || 0, 50) },
  { id: 'lib5', name: '开卷有益', emoji: '📕', tier: 'bronze', desc: '书库读 5 章',
    progress: (c) => p(c.lifetime.library || 0, 5) },
  { id: 'lib50', name: '原版书读者', emoji: '🐋', tier: 'gold', desc: '书库读 50 章',
    progress: (c) => p(c.lifetime.library || 0, 50) },

  // —— 输出 ——
  { id: 'wr3', name: '笔耕不辍', emoji: '✍️', tier: 'silver', desc: '完成 3 篇写作',
    progress: (c) => p(c.lifetime.writing || 0, 3) },
  { id: 'wr20', name: '下笔有神', emoji: '🖋️', tier: 'gold', desc: '完成 20 篇写作',
    progress: (c) => p(c.lifetime.writing || 0, 20) },
  { id: 'ph10', name: '随手拍', emoji: '📷', tier: 'bronze', desc: '拍照翻译 10 次',
    progress: (c) => p(c.lifetime.photo || 0, 10) },

  // —— 路径 ——
  { id: 'pu1', name: '初出茅庐', emoji: '🎯', tier: 'bronze', desc: '完成路径第 1 单元',
    progress: (c) => p(c.pathUnitsDone, 1) },
  { id: 'pu3', name: '过半征程', emoji: '🚀', tier: 'silver', desc: '完成路径 3 个单元',
    progress: (c) => p(c.pathUnitsDone, 3) },
  { id: 'pu6', name: '通关', emoji: '🎓', tier: 'gold', desc: '完成全部 6 个单元',
    progress: (c) => p(c.pathUnitsDone, 6) },

  // —— 词汇量补充阶梯 ——
  { id: 'w300', name: '稳扎稳打', emoji: '🌿', tier: 'bronze', desc: '累计学会 300 个词',
    progress: (c) => p(c.learned, 300) },
  { id: 'w2000', name: '词汇富户', emoji: '💠', tier: 'gold', desc: '累计学会 2000 个词',
    progress: (c) => p(c.learned, 2000) },
  { id: 'w5000', name: '词海无涯', emoji: '🌊', tier: 'gold', desc: '累计学会 5000 个词',
    progress: (c) => p(c.learned, 5000) },

  // —— 学习次数 ——
  { id: 'ln200', name: '学而不厌', emoji: '📘', tier: 'bronze', desc: '累计学习 200 次',
    progress: (c) => p(c.lifetime.learn || 0, 200) },
  { id: 'ln1000', name: '积少成多', emoji: '🧱', tier: 'silver', desc: '累计学习 1000 次',
    progress: (c) => p(c.lifetime.learn || 0, 1000) },
  { id: 'ln3000', name: '铁杵成针', emoji: '⚒️', tier: 'gold', desc: '累计学习 3000 次',
    progress: (c) => p(c.lifetime.learn || 0, 3000) },

  // —— 复习 ——
  { id: 'rv50', name: '温故知新', emoji: '🔁', tier: 'bronze', desc: '累计复习 50 次',
    progress: (c) => p(c.lifetime.review || 0, 50) },
  { id: 'rv500', name: '记忆大师', emoji: '🧠', tier: 'silver', desc: '累计复习 500 次',
    progress: (c) => p(c.lifetime.review || 0, 500) },
  { id: 'rv2000', name: '过目不忘', emoji: '🐘', tier: 'gold', desc: '累计复习 2000 次',
    progress: (c) => p(c.lifetime.review || 0, 2000) },

  // —— 坚持（补充） ——
  { id: 's14', name: '两周不断', emoji: '📆', tier: 'silver', desc: '连续打卡 14 天',
    progress: (c) => p(c.streak, 14) },
  { id: 's60', name: '两月坚持', emoji: '🌙', tier: 'gold', desc: '连续打卡 60 天',
    progress: (c) => p(c.streak, 60) },
  { id: 'c7', name: '坚持一周', emoji: '🎗️', tier: 'bronze', desc: '累计打卡 7 天',
    progress: (c) => p(c.checkinDays, 7) },
  { id: 'c30', name: '满月', emoji: '🌕', tier: 'silver', desc: '累计打卡 30 天',
    progress: (c) => p(c.checkinDays, 30) },
  { id: 'c365', name: '一年之约', emoji: '🗓️', tier: 'gold', desc: '累计打卡 365 天',
    progress: (c) => p(c.checkinDays, 365) },

  // —— 听力 ——
  { id: 'l500', name: '听力大师', emoji: '🏛️', tier: 'gold', desc: '完成 500 篇听力',
    progress: (c) => p(c.lifetime.listening || 0, 500) },

  // —— 口语 ——
  { id: 'sp200', name: '语音达人', emoji: '📢', tier: 'gold', desc: '口语跟读 200 次',
    progress: (c) => p(c.lifetime.speaking || 0, 200) },

  // —— 对话 ——
  { id: 'd300', name: '畅聊无阻', emoji: '🫱', tier: 'gold', desc: '对话 300 轮',
    progress: (c) => p(c.lifetime.dialogue || 0, 300) },

  // —— 阅读 ——
  { id: 'r100', name: '阅读狂人', emoji: '🗞️', tier: 'gold', desc: '读完 100 篇文章',
    progress: (c) => p(c.lifetime.reading || 0, 100) },

  // —— 书库（补充） ——
  { id: 'lib1', name: '翻开第一本', emoji: '📖', tier: 'bronze', desc: '书库读 1 章',
    progress: (c) => p(c.lifetime.library || 0, 1) },
  { id: 'lib10', name: '读完一本', emoji: '📕', tier: 'silver', desc: '书库读 10 章',
    progress: (c) => p(c.lifetime.library || 0, 10) },
  { id: 'lib100', name: '博览群书', emoji: '🏛️', tier: 'gold', desc: '书库读 100 章',
    progress: (c) => p(c.lifetime.library || 0, 100) },

  // —— 国外新闻 ——
  { id: 'nw10', name: '时事入门', emoji: '📰', tier: 'bronze', desc: '看 10 条国外新闻',
    progress: (c) => p(c.lifetime.news || 0, 10) },
  { id: 'nw50', name: '国际视野', emoji: '🌍', tier: 'silver', desc: '看 50 条国外新闻',
    progress: (c) => p(c.lifetime.news || 0, 50) },
  { id: 'nw200', name: '全球观察', emoji: '🛰️', tier: 'gold', desc: '看 200 条国外新闻',
    progress: (c) => p(c.lifetime.news || 0, 200) },

  // —— 写作（补充） ——
  { id: 'wr50', name: '写作高手', emoji: '📝', tier: 'gold', desc: '完成 50 篇写作',
    progress: (c) => p(c.lifetime.writing || 0, 50) },

  // —— 拍照翻译（补充） ——
  { id: 'ph50', name: '拍遍全书', emoji: '📸', tier: 'silver', desc: '拍照翻译 50 次',
    progress: (c) => p(c.lifetime.photo || 0, 50) },
  { id: 'ph200', name: '行走的词典', emoji: '🔎', tier: 'gold', desc: '拍照翻译 200 次',
    progress: (c) => p(c.lifetime.photo || 0, 200) },

  // —— AI 教练 ——
  { id: 'co5', name: '有问必答', emoji: '🧭', tier: 'bronze', desc: '问 AI 教练 5 次',
    progress: (c) => p(c.lifetime.coach || 0, 5) },
  { id: 'co50', name: '良师益友', emoji: '🎓', tier: 'silver', desc: '问 AI 教练 50 次',
    progress: (c) => p(c.lifetime.coach || 0, 50) },

  // —— 错题本 ——
  { id: 'wb20', name: '直面错误', emoji: '🩹', tier: 'bronze', desc: '错题本累计 20 个词',
    progress: (c) => p(c.wrongCount, 20) },
  { id: 'wb100', name: '错题清道夫', emoji: '🧹', tier: 'silver', desc: '错题本累计 100 个词',
    progress: (c) => p(c.wrongCount, 100) },
]

export const TIER_STYLE: Record<string, string> = {
  bronze: 'from-amber-600 to-orange-700',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-amber-600',
}

export const TIER_LABEL: Record<string, string> = {
  bronze: '铜',
  silver: '银',
  gold: '金',
}
