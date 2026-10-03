import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(ROOT, "src/server/knowledge-index.ts"), "utf8").replace(
  /^import .*;\n/gm,
  "",
);
const harness = `const CHAT_CONFIG = { embeddingModel: "test", dimensions: 3, chunkSize: 100,
  chunkOverlap: 10, generationModel: "test", useAnthropic: false };
${source}`;
const { outputText } = ts.transpileModule(harness, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { syncKnowledgeIndex } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const SOURCES = [{ id: "bio", category: "about", title: "Bio", body: "# Bio\nCurrent text" }];
const ingestKnowledge = (env) => syncKnowledgeIndex(env, SOURCES);

function makeEnv() {
  const state = { documents: new Map(), fts: new Map(), chunks: new Map(), vectors: new Map() };
  const faults = { batch: false, vectorDelete: false };
  const execute = (sql, args, draft) => {
    if (sql.startsWith("INSERT INTO documents ")) {
      const [id, , category, title, content, hash] = args;
      draft.documents.set(id, { hash, category, title, content });
    } else if (sql.startsWith("DELETE FROM documents_fts")) draft.fts.delete(args[0]);
    else if (sql.startsWith("INSERT INTO documents_fts")) draft.fts.set(args[1], args[0]);
    else if (sql.startsWith("DELETE FROM chunks")) {
      for (const [id, row] of draft.chunks) if (row.docId === args[0]) draft.chunks.delete(id);
    } else if (sql.startsWith("INSERT INTO chunks")) {
      const [id, docId, idx, content] = args;
      draft.chunks.set(id, { docId, idx, content });
    } else if (sql.startsWith("DELETE FROM documents ")) draft.documents.delete(args[0]);
    else throw new Error(`Unexpected write: ${sql}`);
  };
  const DB = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.startsWith("SELECT hash")) return state.documents.get(args[0]) ?? null;
              if (sql.startsWith("SELECT content FROM documents_fts")) {
                const content = state.fts.get(args[0]);
                return content === undefined ? null : { content };
              }
              throw new Error(`Unexpected first: ${sql}`);
            },
            async all() {
              if (sql.startsWith("SELECT idx, content FROM chunks")) {
                return {
                  results: [...state.chunks.values()]
                    .filter((r) => r.docId === args[0])
                    .sort((a, b) => a.idx - b.idx),
                };
              }
              if (sql.startsWith("SELECT id FROM chunks")) {
                return {
                  results: [...state.chunks.entries()]
                    .filter(
                      ([, r]) => r.docId === args[0] && (args[1] === undefined || r.idx >= args[1]),
                    )
                    .map(([id]) => ({ id })),
                };
              }
              throw new Error(`Unexpected all: ${sql}`);
            },
          };
        },
        async all() {
          if (sql === "SELECT id FROM documents")
            return { results: [...state.documents.keys()].map((id) => ({ id })) };
          throw new Error(`Unexpected all: ${sql}`);
        },
        sql,
      };
    },
    async batch(statements) {
      const draft = Object.fromEntries(
        Object.entries(state).map(([key, map]) => [key, new Map(map)]),
      );
      for (const stmt of statements) {
        execute(stmt.sql, stmt.args, draft);
        if (faults.batch && stmt.sql.startsWith("INSERT INTO documents_fts"))
          throw new Error("D1 batch failed");
      }
      for (const key of Object.keys(state)) state[key] = draft[key];
    },
  };
  // Keep SQL and bound values on each prepared statement for the batch.
  const prepare = DB.prepare;
  DB.prepare = (sql) => {
    const stmt = prepare(sql);
    const bind = stmt.bind;
    stmt.bind = (...args) => ({ ...bind(...args), sql, args });
    return stmt;
  };
  return {
    state,
    faults,
    env: {
      DB,
      CACHE: {},
      AI: {
        async run(_model, { text }) {
          return { data: text.map(() => [1, 2, 3]) };
        },
      },
      VECTORIZE: {
        async upsert(vectors) {
          for (const vector of vectors) state.vectors.set(vector.id, vector);
        },
        async deleteByIds(ids) {
          if (faults.vectorDelete) throw new Error("Vector delete failed");
          for (const id of ids) state.vectors.delete(id);
        },
      },
    },
  };
}

test("failed D1 batch leaves the old hash and retries all search text", async () => {
  const { env, state, faults } = makeEnv();
  faults.batch = true;
  await assert.rejects(ingestKnowledge(env), /D1 batch failed/);
  assert.equal(state.documents.size, 0);
  assert.equal(state.fts.size, 0);
  assert.equal(state.chunks.size, 0);
  faults.batch = false;
  assert.equal((await ingestKnowledge(env)).ok, true);
  assert.equal(state.documents.get("bio").content, "# Bio\nCurrent text");
  assert.equal(state.fts.get("bio"), "# Bio\nCurrent text");
  assert.equal(state.chunks.get("bio#0").content, "Bio\nCurrent text");
});

test("a matching hash repairs stale keyword text", async () => {
  const { env, state } = makeEnv();
  await ingestKnowledge(env);
  state.fts.set("bio", "old text");
  const result = await ingestKnowledge(env);
  assert.equal(result.indexed, 1);
  assert.equal(state.fts.get("bio"), "# Bio\nCurrent text");
});

test("a matching hash repairs missing passages and removes stale tail vectors", async () => {
  const { env, state } = makeEnv();
  await ingestKnowledge(env);
  state.chunks.set("bio#1", { docId: "bio", idx: 1, content: "stale passage" });
  state.vectors.set("bio#1", {});
  const result = await ingestKnowledge(env);
  assert.equal(result.indexed, 1);
  assert.equal(result.removedVectors, 1);
  assert.equal(state.chunks.has("bio#1"), false);
  assert.equal(state.vectors.has("bio#1"), false);
});

test("a failed stale-vector delete keeps the old document for retry", async () => {
  const { env, state, faults } = makeEnv();
  await ingestKnowledge(env);
  state.documents.set("gone", { hash: "old" });
  state.chunks.set("gone#0", { docId: "gone", idx: 0, content: "old" });
  state.fts.set("gone", "old");
  state.vectors.set("gone#0", {});
  faults.vectorDelete = true;
  await assert.rejects(ingestKnowledge(env), /Vector delete failed/);
  assert.equal(state.documents.has("gone"), true);
  faults.vectorDelete = false;
  const result = await ingestKnowledge(env);
  assert.equal(result.removedDocs, 1);
  assert.equal(result.removedVectors, 1);
  assert.equal(state.documents.has("gone"), false);
  assert.equal(state.vectors.has("gone#0"), false);
});
