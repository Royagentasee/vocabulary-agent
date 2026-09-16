"""口语陪练路由"""
from fastapi import APIRouter, HTTPException

from app.schemas.dialogue import (
    DialogueScoreRequest,
    DialogueScoreResponse,
    DialogueStartRequest,
    DialogueStartResponse,
    DialogueTurnRequest,
    DialogueTurnResponse,
)
from app.services.dialogue import score_dialogue, start_dialogue, turn_dialogue

router = APIRouter(prefix="/api/ai/dialogue", tags=["dialogue"])


@router.post("/start", response_model=DialogueStartResponse)
async def post_start(req: DialogueStartRequest) -> DialogueStartResponse:
    return await start_dialogue(req)


@router.post("/turn", response_model=DialogueTurnResponse)
async def post_turn(req: DialogueTurnRequest) -> DialogueTurnResponse:
    try:
        return await turn_dialogue(req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/score", response_model=DialogueScoreResponse)
async def post_score(req: DialogueScoreRequest) -> DialogueScoreResponse:
    return await score_dialogue(req)