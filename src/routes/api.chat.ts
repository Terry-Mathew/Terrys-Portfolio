import { createFileRoute } from "@tanstack/react-router";

import { isChatCancelled, runChat } from "@/server/chat";
import { recordChatHealth, readChatHealth } from "@/server/chat-status";
import { sanitiseHistory } from "@/server/history";
import { getCloudflareEnv } from "@/server/env";

// POST /api/chat  —  server-sent events
// GET  /api/chat  —  whether the chatbot is currently serving degraded answers
//
// The Workers AI binding returns a single response, so the answer itself cannot
// arrive token by token. What this stream does report is the work that actually
// happens between the question and the answer: retrieval, then generation.
// Those are real boundaries and real timings, and showing them turns three
// seconds of dead air into three seconds of legible progress.
//
// POST events, in order:
//
//   started  { requestId }            one per turn, so a client can correlate
//   phase    { phase, count? }        "searching" | "retrieved"
//   sources  { sources[], docIds[] }  which sections were used
//   delta    { text }                 the answer, incrementally
//   warning  { reason }               retrieval or generation was degraded
//   done     { answer, …metadata }    terminal, on success
//   cancelled {}                      terminal, visitor or client hung up
//   error    { message }              terminal, on failure
//
// `docIds` stays on `sources` even though a client that only renders links has
// no use for it: it is what lets the widget strip inline citation markers *as
// tokens arrive*. A marker can be split across deltas ("[", "bio", "]"), so it
// is not recognisable after the fact. Dropping the field breaks that silently —
// the citations simply stop being removed.
//
// Degraded retrieval is reported three ways, all honest: a `warning` event on
// the stream (so the widget can flip its status dot live), a console.warn on
// every static fallback (visible in Worker logs and the observability
// dashboard), and `retrievalMode` on `done`.
//
// It is deliberately NOT an X-RAG-* response header. Retrieval happens after
// the response head is already flushed, so such a header could only ever carry
// a hardcoded default — and a false signal is worse than no signal.

const encoder = new TextEncoder();

const event = (data: unknown) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

/** An SSE comment. Ignored by every conformant client, but keeps proxies alive. */
const HEARTBEAT = encoder.encode(":hb\n\n");

const HEARTBEAT_MS = 12000;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      // Status check for the panel's availability dot. Same route as the stream
      // rather than a new one: an extra public endpoint is an extra thing to
      // keep alive and to get the caching headers wrong, and this is only ever
      // read when a panel opens.
      //
      // Cached for a minute at the edge. KV is eventually consistent anyway, so
      // a staler answer costs nothing — and this must never be a reason the
      // widget cannot open.
      GET: async ({ request }) => {
        const env = getCloudflareEnv(undefined, request);
        const health = await readChatHealth(env);
        return Response.json(health, {
          headers: { "cache-control": "public, max-age=60" },
        });
      },

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
        // The history array comes straight from the browser. Casting it to
        // ChatTurn[] without clamping it let a client push megabytes into the
        // condensing and generation prompts — and input tokens are billed.
        const history = sanitiseHistory(body.history);

        const startedAt = Date.now();
        const requestId = crypto.randomUUID();
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

            // Keeps the connection open through a slow provider tier. Without
            // it, an intermediary that closes an idle stream ends the turn
            // during retrieval or generation and the visitor gets a network
            // error for an answer that was about to arrive.
            //
            // Cleared in `finally`, so it never outlives the turn, and guarded
            // on `closed` so it cannot enqueue into an already-closed stream.
            const heartbeat = setInterval(() => {
              if (!closed) controller.enqueue(HEARTBEAT);
            }, HEARTBEAT_MS);

            try {
              send({ type: "started", requestId });

              const reply = await runChat(
                body.q as string,
                history,
                env,
                request,
                // The real boundaries of the turn. Previously wired as
                // `undefined`, so the widget could not distinguish "still
                // searching" from "hung" and had to either guess or show
                // nothing.
                (phase) => send({ type: "phase", ...phase }),
                (text) => send({ type: "delta", text }),
                (sources, docIds) => send({ type: "sources", sources, docIds }),
                // The visitor's own connection. Without it a cancelled turn
                // aborted its fetch, the provider chain read that as a failure,
                // and started the next tier.
                request.signal,
              );

              const mode = reply.metadata?.retrievalMode;
              const generation = reply.metadata?.generation;
              // runChat decides this, because only it can tell a fallback answer
              // apart from a turn that never needed the pipeline. Deriving it
              // here from `retrievalMode === "static"` marked a healthy chatbot
              // as broken whenever a question was too long, hit a blocked
              // keyword, or tripped the rate limit.
              const degraded = reply.metadata?.degraded === true;
              if (degraded) {
                send({ type: "warning", reason: `${mode}/${generation}` });
              }
              await recordChatHealth(env, !degraded);

              if (mode === "static") {
                console.warn(
                  `[rag] DEGRADED to static retrieval in ${Date.now() - startedAt}ms`,
                  reply.metadata,
                );
              }
              console.info(
                `[rag] ${mode} | ${reply.metadata?.chunksUsed} chunks | ` +
                  `${Date.now() - startedAt}ms | cached=${reply.metadata?.cached}`,
              );
              // `answer` is repeated here because streamed deltas are the normal
              // path, but a rate-limited or extractive response has none. The
              // client and the eval suite read the answer from this field when
              // no delta ever arrived.
              // `provider` is an alias for `generation`, which is what the eval
              // harness and the Worker logs already key on.
              send({
                type: "done",
                answer: reply.answer,
                provider: generation,
                ...reply.metadata,
              });
            } catch (error) {
              if (isChatCancelled(error)) {
                // Not an error. The visitor hung up, the browser tab closed, or
                // the client's own deadline fired — all normal, and none of
                // them something to render as a failure. The distinction
                // matters because these used to be indistinguishable from a
                // real error, so cancelling turned the whole panel red.
                console.info(`[rag] cancelled after ${Date.now() - startedAt}ms`);
                send({ type: "cancelled" });
              } else {
                console.error("Chat stream failed:", error);
                // A turn that threw produced nothing. The flag exists so the
                // panel stops claiming to be available.
                await recordChatHealth(env, false);
                send({
                  type: "error",
                  message: "Something went wrong. Email terry.perangat@gmail.com instead.",
                });
              }
            } finally {
              clearInterval(heartbeat);
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
