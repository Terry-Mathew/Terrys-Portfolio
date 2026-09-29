import { createFileRoute } from "@tanstack/react-router";

import { runChat, type ChatTurn } from "@/server/chat";
import { getCloudflareEnv } from "@/server/env";

// POST /api/chat  —  server-sent events
//
// The Workers AI binding returns a single response, so the answer itself cannot
// arrive token by token. What this stream does report is the work that actually
// happens between the question and the answer: retrieval, then generation.
// Those are real boundaries and real timings, and showing them turns three
// seconds of dead air into three seconds of legible progress.
//
// Events: status -> sources -> delta -> done
//   status  { phase, count }   retrieval progress
//   sources { sources[] }     which sections were used
//   delta   { text }          the full answer
//   done    { metadata }

const encoder = new TextEncoder();

const event = (data: unknown) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { q?: unknown; history?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        if (typeof body.q !== "string" || !body.q.trim()) {
          return Response.json({ error: "Missing question." }, { status: 400 });
        }

        const env = getCloudflareEnv(undefined, request);
        const history = Array.isArray(body.history) ? (body.history as ChatTurn[]) : [];

        // Degraded retrieval is reported two ways, both honest:
        //  - server-side: console.warn on every static fallback, which shows up
        //    in Worker logs and Cloudflare's observability dashboard
        //  - client-side: the `done` event carries retrievalMode, which the
        //    widget logs to the console
        //
        // It is deliberately NOT an X-RAG-* response header. Retrieval happens
        // after the response head is already flushed, so such a header could
        // only ever carry a hardcoded default — a false signal is worse than
        // no signal.
        const startedAt = Date.now();
        const headers = new Headers({
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-store",
          "x-accel-buffering": "no",
        });

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let closed = false;
            const send = (data: unknown) => {
              if (!closed) controller.enqueue(event(data));
            };

            try {
              const reply = await runChat(
                body.q as string,
                history,
                env,
                request,
                undefined,
                (text) => send({ type: "delta", text }),
                (sources, docIds) => send({ type: "sources", sources, docIds }),
              );

              // A degraded retrieval is logged loudly but never shown.
              if (reply.metadata?.retrievalMode === "static") {
                console.warn(
                  `[rag] DEGRADED to static retrieval in ${Date.now() - startedAt}ms`,
                  reply.metadata,
                );
              }
              console.info(
                `[rag] ${reply.metadata?.retrievalMode} | ${reply.metadata?.chunksUsed} chunks | ` +
                  `${Date.now() - startedAt}ms | cached=${reply.metadata?.cached}`,
              );
              send({ type: "done", metadata: reply.answer, ...reply.metadata });
            } catch (error) {
              headers.set("x-rag-mode", "error");
              console.error("Chat stream failed:", error);
              send({
                type: "error",
                message: "Something went wrong. Email terry.perangat@gmail.com instead.",
              });
            } finally {
              closed = true;
              controller.close();
            }
          },
        });

        return new Response(stream, { headers });
      },
    },
  },
});
