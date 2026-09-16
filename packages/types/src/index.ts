/**
 * Vocabulary Agent 共享类型定义
 * 跨端（Web / Mobile / Mini / Desktop）+ 跨服务（NestJS / FastAPI）共用的领域模型
 */

// ===== 词条 =====
export interface RootAffix {
  prefix: string
  prefixMeaning: string
  root: string
  rootMeaning: string
  suffix: string
  suffixMeaning: string
}

export interface Word {
  id: string
  headword: string            // 单词原型
  pos: string[]               // 词性
  ipa: string                 // IPA
  audioUrl: string
  senses: Sense[]             // 多义项
  etymology: string           // 词根词缀
  rootAffix: RootAffix | null  // 词根词缀拆解
  collocations: string[]      // 搭配
  examTags: ExamTag[]         // 考点 / 考频
  examples: Example[]         // 真题例句
}

export interface Sense {
  pos: string
  definitionEn: string
  definitionCn: string
}

export interface ExamTag {
  exam: 'IELTS' | 'TOEFL' | 'GRE' | 'SAT' | 'CET'
  level?: string               // 例：'7+', '1500+'
  frequency: number
}

export interface Example {
  sentence: string
  translation: string
  source?: string              // 例：'Cambridge IELTS 14 Test 1'
}

// ===== 用户学习进度 =====
export type LearningStatus = 'new' | 'learning' | 'review' | 'mastered'

export interface FSRSCardState {
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: 'new' | 'learning' | 'review' | 'relearning'
  lastReview: string          // ISO timestamp
}

export interface UserWordProgress {
  userId: string
  wordId: string
  status: LearningStatus
  fsrs: FSRSCardState
  lastReviewedAt: string
  nextDueAt: string
  wrongCount: number
}

// ===== 复习会话 =====
export type ReviewMode = 'recall' | 'spell' | 'cloze' | 'ai_dialog'

export interface ReviewSession {
  id: string
  userId: string
  mode: ReviewMode
  items: ReviewItem[]
  startedAt: string
  endedAt?: string
}

export interface ReviewItem {
  wordId: string
  rating?: 1 | 2 | 3 | 4 | 5   // 用户评分
  durationMs?: number
}

// ===== AI 会话 =====
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AIExplanationRequest {
  wordId: string
  userId: string
  context?: string             // 上下文（例句 / 段落）
}

export interface AIExplanationResponse {
  explanation: string
  etymology: string
  rootAffix?: RootAffix | null
  examples: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

// ===== 用户 =====
export interface User {
  id: string
  nickname: string
  avatarUrl?: string
  targetExam?: 'IELTS' | 'TOEFL' | 'GRE' | 'SAT'
  examDate?: string
  dailyGoal: number            // 每日新词目标
}
