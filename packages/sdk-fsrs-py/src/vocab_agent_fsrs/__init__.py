"""FSRS 算法 SDK（Python 端）

与 TypeScript 端 (@vocab-agent/sdk-fsrs) 保持 API 对齐。
"""
from fsrs import Scheduler, Card, Rating, State

__all__ = ["Scheduler", "Card", "Rating", "State"]


def to_internal_state(card: Card) -> dict:
    """将 fsrs.Card 转为内部 dict 存储格式。"""
    return {
        "stability": card.stability,
        "difficulty": card.difficulty,
        "elapsedDays": card.elapsed_days,
        "scheduledDays": card.scheduled_days,
        "reps": card.reps,
        "lapses": card.lapses,
        "state": card.state.name.lower(),
        "lastReview": card.last_review.isoformat() if card.last_review else None,
    }
