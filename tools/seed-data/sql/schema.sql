-- Vocabulary Agent 数据库 Schema
-- PostgreSQL 16 + pgvector

CREATE EXTENSION IF NOT EXISTS vector;

-- ============ 词条 ============
CREATE TABLE IF NOT EXISTS words (
    id            BIGSERIAL PRIMARY KEY,
    headword      TEXT NOT NULL,
    ipa           TEXT,
    pos           TEXT[],
    translation   TEXT,
    translation_en TEXT,
    etymology     TEXT,
    collocations  TEXT[],
    exam_tags     JSONB DEFAULT '[]'::jsonb,
    frq           REAL,                       -- ECDICT 频率（0-100）
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (headword)
);

CREATE INDEX IF NOT EXISTS idx_words_headword ON words (headword);
CREATE INDEX IF NOT EXISTS idx_words_frq ON words (frq DESC);

-- ============ 词条向量（用于 RAG） ============
CREATE TABLE IF NOT EXISTS word_embeddings (
    word_id    BIGINT PRIMARY KEY REFERENCES words(id) ON DELETE CASCADE,
    embedding  vector(1024),                 -- 与 embedding 模型对齐
    model      TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ 词书 ============
CREATE TABLE IF NOT EXISTS wordbooks (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT,
    exam_tag     TEXT,
    cover_color  TEXT,
    word_count   INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============ 词书 ↔ 词条 ============
CREATE TABLE IF NOT EXISTS wordbook_words (
    wordbook_id TEXT NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
    word_id     BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    ord         INT NOT NULL,
    PRIMARY KEY (wordbook_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_wbw_wordbook ON wordbook_words (wordbook_id, ord);

-- ============ 用户学习进度 ============
CREATE TABLE IF NOT EXISTS user_word_progress (
    user_id          TEXT NOT NULL,
    word_id          BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    status           TEXT NOT NULL DEFAULT 'new',
    fsrs_state       JSONB NOT NULL,
    last_reviewed_at TIMESTAMPTZ,
    next_due_at      TIMESTAMPTZ,
    wrong_count      INT DEFAULT 0,
    PRIMARY KEY (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_uwp_user_due ON user_word_progress (user_id, next_due_at);
