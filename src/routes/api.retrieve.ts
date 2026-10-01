import { createFileRoute } from "@tanstack/react-router";

import { getCloudflareEnv } from "@/server/env";
import { retrieveHybrid } from "@/server/knowledge";
import { CHAT_CONFIG } from "@/server/chat.config";

// POST /api/retrieve   runs retrieval only — no generation, no answer cache
// GET  /api/retrieve?q=...&check=1   the same thing with a query string
//
// Requires x-ingest-key. It exposes nothing to an anonymous caller and it
// returns the corpus itself, so it must not be public.
//
// Why this exists: "the answer was wrong" is not a diagnosis. A persona
// rewrite cannot fix a corpus that does not contain the answer, and the two
// look identical from the chat window. Asking /api/chat for the answer and
// reading the sources frame mostly works, except it cannot see anything when
// the answer comes from cache — which is exactly when the corpus is stale and
// someone is most tempted to blame the prompt. This endpoint runs the search
// and stops.

export const Route = createFileRoute("/api/retrieve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = getCloudflareEnv(undefined, request);
        if (!env?.INGEST_KEY) {
          return Response.json(
            { ok: false, message: "INGEST_KEY secret is not set on this Worker." },
            { status: 500 },
          );
        }
        if (request.headers.get("x-ingest-key") !== env.INGEST_KEY) {
          return Response.json(
            { ok: false, message: "Unauthorized: bad or missing x-ingest-key." },
            { status: 401 },
          );
        }

        let q: string;
        try {
          const body = (await request.json()) as { q?: unknown };
          if (typeof body.q !== "string" || !body.q.trim()) {
            return Response.json({ ok: false, message: "Missing question." }, { status: 400 });
          }
          q = body.q;
        } catch {
          return Response.json({ ok: false, message: "Invalid JSON body." }, { status: 400 });
        }

        return Response.json(await runRetrievalOnly(q, env), { status: 200 });
      },

      GET: async ({ request }) => {
        const env = getCloudflareEnv(undefined, request);
        if (!env?.INGEST_KEY) {
          return Response.json(
            { ok: false, message: "INGEST_KEY secret is not set on this Worker." },
            { status: 500 },
          );
        }
        if (request.headers.get("x-ingest-key") !== env.INGEST_KEY) {
          return Response.json(
            { ok: false, message: "Unauthorized: bad or missing x-ingest-key." },
            { status: 401 },
          );
        }
        const q = new URL(request.url).searchParams.get("q");
        if (!q || !q.trim()) {
          return Response.json({ ok: false, message: "Missing q." }, { status: 400 });
        }
        return Response.json(await runRetrievalOnly(q, env), { status: 200 });
      },
    },
  },
});

async function runRetrievalOnly(
  question: string,
  env: NonNullable<ReturnType<typeof getCloudflareEnv>>,
) {
  const bindingsPresent = Boolean(env.VECTORIZE && env.DB && env.CACHE && env.AI);

  if (!bindingsPresent) {
    return {
      ok: false,
      question,
      message: "Vector bindings are not bound. Retrieval fell back to the static table.",
      methods: { static: true, bm25: false, vector: false, cache: false },
      results: [],
    };
  }

  try {
    const results = await retrieveHybrid(question, env as never, CHAT_CONFIG);
    // Cache provenance is a separate flag from the source, so this counts only
    // the results that were replayed rather than every result that came from
    // the cache. The `live` split below stays honest for the same reason.
    const cached = results.filter((r) => r.fromCache === true);
    const live = results.filter((r) => r.fromCache !== true);
    const methods = {
      static: live.some((r) => r.source === "static"),
      bm25: live.some((r) => r.source === "bm25"),
      vector: live.some((r) => r.source === "vector"),
      cache: cached.length > 0,
    };

    const liveCount = Number(methods.static) + Number(methods.bm25) + Number(methods.vector);

    return {
      ok: true,
      question,
      // "hybrid" only when more than one method actually returned something.
      // The chat route derives its reported mode the same way, because
      // retrieveHybrid never throws for an empty path — a call succeeding
      // proves nothing about what contributed to it.
      mode:
        liveCount === 0
          ? "none"
          : liveCount === 1
            ? methods.static
              ? "static"
              : "single"
            : "hybrid",
      methods,
      results: live.map((r) => ({
        id: r.id,
        anchor: r.anchor,
        title: r.title,
        source: r.source,
        score: Number(r.score.toFixed(6)),
        chars: r.content.length,
        // The passage, so a caller can check whether the answer is in it.
        preview: r.content.slice(0, 400),
      })),
    };
  } catch (error) {
    return {
      ok: false,
      question,
      message: error instanceof Error ? error.message : "Retrieval threw.",
      results: [],
    };
  }
}
