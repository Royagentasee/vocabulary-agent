/**
 * 学习路径
 *
 * 把分散的 12 个模块串成一条主线：用户只需点「继续」，不用想学什么。
 * 这是多邻国留存高的根本原因。
 *
 * 完成方式：课程按类型绑定真实行为（学词/听力/阅读…），
 * 在对应页面里做了就自动累加进度，不用手动打勾。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ActivityType =
  | 'learn' | 'review' | 'listening' | 'speaking' | 'dialogue'
  | 'reading' | 'library' | 'photo' | 'writing' | 'checkpoint'

export interface PathLesson {
  id: string
  title: string
  desc: string
  type: ActivityType
  target: number
  route: string
  emoji: string
}

export interface PathUnit {
  id: string
  title: string
  subtitle: string
  level: string
  color: string
  lessons: PathLesson[]
}

/** 路线图：6 个单元，由易到难，覆盖全部模块 */
export const PATH_UNITS: PathUnit[] = [
  {
    id: 'u1',
    title: '打基础',
    subtitle: '认识这个 App，攒下第一批词',
    level: 'A2',
    color: 'from-green-500 to-emerald-600',
    lessons: [
      { id: 'u1l1', title: '学 20 个新词', desc: '先选意思，再看词根和例句', type: 'learn', target: 20, route: '/learn', emoji: '📖' },
      { id: 'u1l2', title: '复习 10 个词', desc: 'FSRS 会挑快忘的词给你', type: 'review', target: 10, route: '/review', emoji: '🔄' },
      { id: 'u1l3', title: '做 1 篇听力', desc: '1000 篇托福雅思材料随便挑', type: 'listening', target: 1, route: '/listening', emoji: '🎧' },
      { id: 'u1c', title: '单元测验', desc: '20 道词义题，检验这一单元', type: 'checkpoint', target: 1, route: '', emoji: '🏆' },
    ],
  },
  {
    id: 'u2',
    title: '养成习惯',
    subtitle: '把「每天来一趟」变成肌肉记忆',
    level: 'A2',
    color: 'from-teal-500 to-cyan-600',
    lessons: [
      { id: 'u2l1', title: '学 30 个新词', desc: '词汇量开始上量', type: 'learn', target: 30, route: '/learn', emoji: '📖' },
      { id: 'u2l2', title: '复习 20 个词', desc: '今天必须清掉的到期词', type: 'review', target: 20, route: '/review', emoji: '🔄' },
      { id: 'u2l3', title: '口语跟读 3 句', desc: '对着麦克风读，AI 帮你纠正发音', type: 'speaking', target: 3, route: '/speaking', emoji: '🎙️' },
      { id: 'u2l4', title: '听 2 篇听力', desc: '先听一遍，再对答案', type: 'listening', target: 2, route: '/listening', emoji: '🎧' },
      { id: 'u2c', title: '单元测验', desc: '20 道词义题', type: 'checkpoint', target: 1, route: '', emoji: '🏆' },
    ],
  },
  {
    id: 'u3',
    title: '分级阅读入门',
    subtitle: '从能读一篇短文开始',
    level: 'B1',
    color: 'from-blue-500 to-indigo-600',
    lessons: [
      { id: 'u3l1', title: '学 30 个新词', desc: '这次试试更难的词', type: 'learn', target: 30, route: '/learn', emoji: '📖' },
      { id: 'u3l2', title: '初中阅读 2 篇', desc: '点词即查，做完看解析', type: 'reading', target: 2, route: '/reading', emoji: '📗' },
      { id: 'u3l3', title: '拍照翻译 1 段', desc: '随手拍一段英文，试试识别', type: 'photo', target: 1, route: '/photo', emoji: '📷' },
      { id: 'u3c', title: '单元测验', desc: '20 道词义题', type: 'checkpoint', target: 1, route: '', emoji: '🏆' },
    ],
  },
  {
    id: 'u4',
    title: '听说并进',
    subtitle: '敢开口，能接话',
    level: 'B1',
    color: 'from-violet-500 to-purple-600',
    lessons: [
      { id: 'u4l1', title: '复习 30 个词', desc: '把前面的词守住', type: 'review', target: 30, route: '/review', emoji: '🔄' },
      { id: 'u4l2', title: '对话 5 轮', desc: '和 AI 用英语聊，它帮你改语法', type: 'dialogue', target: 5, route: '/dialogue', emoji: '💬' },
      { id: 'u4l3', title: '口语跟读 5 句', desc: '练 th / l / r / v 这些难点音', type: 'speaking', target: 5, route: '/speaking', emoji: '🎙️' },
      { id: 'u4l4', title: '听 3 篇听力', desc: '升级到讲座类材料', type: 'listening', target: 3, route: '/listening', emoji: '🎧' },
      { id: 'u4c', title: '单元测验', desc: '20 道词义题', type: 'checkpoint', target: 1, route: '', emoji: '🏆' },
    ],
  },
  {
    id: 'u5',
    title: '阅读进阶',
    subtitle: '开始读原版书',
    level: 'B2',
    color: 'from-orange-500 to-amber-600',
    lessons: [
      { id: 'u5l1', title: '学 40 个新词', desc: '冲一波词汇量', type: 'learn', target: 40, route: '/learn', emoji: '📖' },
      { id: 'u5l2', title: '高中阅读 2 篇', desc: '高考难度，长句变多', type: 'reading', target: 2, route: '/reading', emoji: '📘' },
      { id: 'u5l3', title: '书库读 1 章', desc: '爱丽丝、绿野仙踪随便挑', type: 'library', target: 1, route: '/library', emoji: '📚' },
      { id: 'u5c', title: '单元测验', desc: '20 道词义题', type: 'checkpoint', target: 1, route: '', emoji: '🏆' },
    ],
  },
  {
    id: 'u6',
    title: '输出训练',
    subtitle: '从「看得懂」到「写得出」',
    level: 'B2',
    color: 'from-rose-500 to-pink-600',
    lessons: [
      { id: 'u6l1', title: '写 1 篇作文', desc: '307 道官方真题，AI 帮你改', type: 'writing', target: 1, route: '/writing', emoji: '✍️' },
      { id: 'u6l2', title: '大学阅读 2 篇', desc: '四六级/考研难度', type: 'reading', target: 2, route: '/reading', emoji: '📕' },
      { id: 'u6l3', title: '对话 5 轮', desc: '用刚学的词造句聊出来', type: 'dialogue', target: 5, route: '/dialogue', emoji: '💬' },
      { id: 'u6c', title: '毕业测验', desc: '20 道词义题，通关这一阶段', type: 'checkpoint', target: 1, route: '', emoji: '🎓' },
    ],
  },
]

/** 展平成便于查找的字典 */
const LESSON_MAP: Record<string, PathLesson> = {}
const UNIT_OF: Record<string, string> = {}
for (const u of PATH_UNITS) {
  for (const l of u.lessons) {
    LESSON_MAP[l.id] = l
    UNIT_OF[l.id] = u.id
  }
}

export function getLesson(id: string): PathLesson | undefined {
  return LESSON_MAP[id]
}

interface PathState {
  /** lessonId -> 已完成的数量 */
  progress: Record<string, number>
  /** lessonId -> 完成时间 */
  completedAt: Record<string, string>
  /** 累计完成课程数 */
  totalCompleted: number

  /** 记录一次真实行为，给当前活跃的同类课程加分 */
  reportActivity: (type: ActivityType, amount?: number) => string | null
  /** 直接完成某课（测验用） */
  completeLesson: (id: string) => void
  resetPath: () => void
}

export const usePathStore = create<PathState>()(
  persist(
    (set, get) => ({
      progress: {},
      completedAt: {},
      totalCompleted: 0,

      reportActivity: (type, amount = 1) => {
        if (type === 'checkpoint') return null
        // 找到第一门「已解锁 + 未完成 + 类型匹配」的课
        const { progress } = get()
        for (const u of PATH_UNITS) {
          for (const l of u.lessons) {
            if (l.type !== type) continue
            if (!isUnlocked(l.id, progress)) continue
            const done = progress[l.id] || 0
            if (done >= l.target) continue
            const next = Math.min(l.target, done + amount)
            const patch: any = { progress: { ...progress, [l.id]: next } }
            if (next >= l.target) {
              patch.completedAt = { ...get().completedAt, [l.id]: new Date().toISOString() }
              patch.totalCompleted = get().totalCompleted + 1
            }
            set(patch)
            return l.id
          }
        }
        return null
      },

      completeLesson: (id) => {
        const lesson = LESSON_MAP[id]
        if (!lesson) return
        const { progress, completedAt, totalCompleted } = get()
        if ((progress[id] || 0) >= lesson.target) return
        set({
          progress: { ...progress, [id]: lesson.target },
          completedAt: { ...completedAt, [id]: new Date().toISOString() },
          totalCompleted: totalCompleted + 1,
        })
      },

      resetPath: () => set({ progress: {}, completedAt: {}, totalCompleted: 0 }),
    }),
    { name: 'vocab-agent-path', version: 1 },
  ),
)

/** 某课是否已解锁：同单元前一课完成，或上一单元全部完成后进入下一单元 */
export function isUnlocked(lessonId: string, progress: Record<string, number>): boolean {
  const unitId = UNIT_OF[lessonId]
  const unitIdx = PATH_UNITS.findIndex((u) => u.id === unitId)
  if (unitIdx < 0) return false

  // 前面的单元必须全部完成
  for (let i = 0; i < unitIdx; i++) {
    const u = PATH_UNITS[i]
    for (const l of u.lessons) {
      if ((progress[l.id] || 0) < l.target) return false
    }
  }

  // 同单元内，前面的课必须完成
  const unit = PATH_UNITS[unitIdx]
  for (const l of unit.lessons) {
    if (l.id === lessonId) return true
    if ((progress[l.id] || 0) < l.target) return false
  }
  return true
}

/** 当前应该做的第一课（全部完成则返回 null） */
export function currentLesson(progress: Record<string, number>): PathLesson | null {
  for (const u of PATH_UNITS) {
    for (const l of u.lessons) {
      if (!isUnlocked(l.id, progress)) continue
      if ((progress[l.id] || 0) < l.target) return l
    }
  }
  return null
}

/** 路径总进度（0-100） */
export function pathPercent(progress: Record<string, number>): number {
  let total = 0
  let done = 0
  for (const u of PATH_UNITS) {
    for (const l of u.lessons) {
      total++
      if ((progress[l.id] || 0) >= l.target) done++
    }
  }
  return total ? Math.round((done / total) * 100) : 0
}

/** 某个单元是否全部完成 */
export function isUnitDone(unit: PathUnit, progress: Record<string, number>): boolean {
  return unit.lessons.every((l) => (progress[l.id] || 0) >= l.target)
}
