"""书库（原版阅读）路由"""
from fastapi import APIRouter, HTTPException, Query

from app.schemas.library import (
    BookDetail,
    BookListResponse,
    ChapterContent,
    LibraryStats,
)
from app.services import library

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("/books", response_model=BookListResponse)
async def get_books(
    kind: str = Query('', description='classic(名著) / story(A-Z小故事) / 空=全部'),
    level: str = Query('', description='A2 / B1 / B2'),
    category: str = Query('', description='分类'),
    letter: str = Query('', description='A-Z（仅小故事）'),
    q: str = Query('', description='搜索关键词'),
    limit: int = Query(200, ge=1, le=500),
) -> BookListResponse:
    """书目列表。"""
    return library.list_books(kind=kind, level=level, category=category,
                              letter=letter, q=q, limit=limit)


@router.get("/books/{book_id}", response_model=BookDetail)
async def get_book(book_id: str) -> BookDetail:
    """书籍详情 + 章节目录。"""
    book = library.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail=f'书籍不存在: {book_id}')
    return book


@router.get("/books/{book_id}/chapters/{index}", response_model=ChapterContent)
async def get_chapter(book_id: str, index: int) -> ChapterContent:
    """章节正文。"""
    ch = library.get_chapter(book_id, index)
    if not ch:
        raise HTTPException(status_code=404, detail=f'章节不存在: {book_id} #{index}')
    return ch


@router.get("/stats", response_model=LibraryStats)
async def get_stats() -> LibraryStats:
    """书库统计。"""
    return library.stats()
