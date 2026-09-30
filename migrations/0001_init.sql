-- D1 schema for the portfolio chat.
--
-- This file is the source of truth. The schema previously existed only as a
-- snippet in ARCHITECTURE.md, which means a new database could not be built
-- from the repository without hand-copying it.
--
-- Apply with:
--   npx wrangler d1 execute terry-knowledge --remote --file=migrations/0001_init.sql

PRAGMA foreign_keys = ON;

-- One row per knowledge file. Holds the full text, which is what the sources
-- list and the /api/ingest response report on.
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  category    TEXT,
  title       TEXT,
  content     TEXT NOT NULL,
  hash        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- One row per passage. Vectorize stores a vector per chunk, so retrieval used
-- to find the right passage and then throw it away, handing the model the whole
-- parent document — every irrelevant section in it consuming prompt space.
-- Retrieval joins against this table to return the passages that actually
-- matched.
CREATE TABLE IF NOT EXISTS chunks (
  id          TEXT PRIMARY KEY,          -- "<document id>#<index>"
  doc_id      TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  idx         INTEGER NOT NULL,
  content     TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);

-- Keyword search. Kept as a separate FTS table so the D1 BM25 path stays
-- independent of Vectorize: one can fail without taking the other with it.
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  content,
  id UNINDEXED,
  tokenize = 'porter unicode61'
);
