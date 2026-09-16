/**
 * FSRS 算法 SDK（TypeScript 端）
 *
 * 暴露 Vocabulary Agent 自身的 Rating 枚举，避免消费方直接依赖 ts-fsrs 的类型，
 * 后续切换底层库无需修改业务代码。
 */
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating as TsFsrsRating,
  State as TsFsrsState,
  type Card as TsFsrsCard,
} from 'ts-fsrs'
import type { FSRSCardState } from '@vocab-agent/types'

/** Vocabulary Agent 自有 Rating（与 ts-fsrs 的 Grade 数值一致） */
export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface FSRSReviewResult {
  card: FSRSCardState
  nextDueAt: Date
  intervalDays: number
}

function ratingToTsFsrs(r: Rating): TsFsrsRating {
  // ts-fsrs 4.x：Rating 枚举（Manual=0, Again=1, Hard=2, Good=3, Easy=4）
  // Vocabulary Agent Rating 与 ts-fsrs 同名枚举数值一致
  return r as unknown as TsFsrsRating
}

function toTsFsrsCard(state: FSRSCardState, now: Date): TsFsrsCard {
  return {
    due: state.lastReview
      ? new Date(new Date(state.lastReview).getTime() + state.scheduledDays * 86400 * 1000)
      : now,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as unknown as TsFsrsState,
    last_review: state.lastReview ? new Date(state.lastReview) : undefined,
    learning_steps: 0,
  } as unknown as TsFsrsCard
}

function fromTsFsrsCard(card: TsFsrsCard): FSRSCardState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: (typeof card.state === 'string'
      ? card.state.toLowerCase()
      : 'new') as FSRSCardState['state'],
    lastReview: card.last_review?.toISOString() ?? new Date().toISOString(),
  }
}

export function createFSRS() {
  const f = fsrs(generatorParameters({ enable_fuzz: false }))

  return {
    review(prev: FSRSCardState, rating: Rating, now: Date = new Date()): FSRSReviewResult {
      const card = toTsFsrsCard(prev, now)
      const result = f.next(card, now, ratingToTsFsrs(rating))
      const nextCard = result.card
      return {
        card: fromTsFsrsCard(nextCard),
        nextDueAt: nextCard.due,
        intervalDays: nextCard.scheduled_days,
      }
    },

    newCard(now: Date = new Date()): FSRSCardState {
      const card = createEmptyCard(now) as unknown as TsFsrsCard
      return fromTsFsrsCard(card)
    },

    forecast(cards: FSRSCardState[], days: number, now: Date = new Date()): FSRSCardState[] {
      return cards.filter((c) => {
        const due = c.lastReview
          ? new Date(new Date(c.lastReview).getTime() + c.scheduledDays * 86400 * 1000)
          : now
        return due.getTime() <= now.getTime() + days * 86400 * 1000
      })
    },
  }
}