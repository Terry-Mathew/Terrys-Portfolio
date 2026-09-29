import { createFileRoute } from "@tanstack/react-router";

import { getCloudflareEnv } from "@/server/env";
import { ingestKnowledge, verifyRetrieval } from "@/server/ingest";

// POST /api/ingest          re-embeds the knowledge base (idempotent)
// GET  /api/ingest?check=1  proves semantic retrieval actually returns results
//
// Both require the x-ingest-key header. Check mode exists because the D1 and
// Vectorize stores can disagree after a failed run — see verifyRetrieval().
export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
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

        try {
          const result = await verifyRetrieval(env);
          return Response.json(result, { status: result.ok ? 200 : 422 });
        } catch (error) {
          console.error("Retrieval check failed:", error);
          return Response.json(
            { ok: false, message: error instanceof Error ? error.message : "Check failed." },
            { status: 500 },
          );
        }
      },

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

        try {
          const force = new URL(request.url).searchParams.get("force") === "1";
          const result = await ingestKnowledge(env, force);
          return Response.json(result, { status: result.ok ? 200 : 422 });
        } catch (error) {
          console.error("Ingestion failed:", error);
          return Response.json(
            { ok: false, message: error instanceof Error ? error.message : "Ingestion failed." },
            { status: 500 },
          );
        }
      },
    },
  },
});
