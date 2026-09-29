import { useEffect, useRef, useState } from "react";
import type { ChatTurn } from "@/server/chat";

const SUGGESTIONS = [
  "What did he do at Oracle?",
  "What is Settle?",
  "What is he looking for in a role?",
];

/**
 * Remove inline citation markers, scoped to the documents that were retrieved.
 * Leaving a partially-arrived marker in place until it completes is deliberate —
 * "[bio" on its own is indistinguishable from legitimate bracketed text.
 */
function stripCitations(text: string, docIds: string[]): string {
  if (docIds.length === 0) return text;
  return text
    .replace(
      new RegExp(
        `\\s*\\[(?:${docIds.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\]\\.??`,
        "g",
      ),
      "",
    )
    .replace(/[ \t]{2,}/g, " ");
}

// RAG chat widget. Streams tokens from POST /api/chat.
//
// Retrieval progress is deliberately NOT surfaced. "Found 4 relevant sections"
// is instrumentation, not conversation — showing it made the bot feel like a
// status dashboard. The diagnostics still ride in the X-RAG-* response headers
// for anyone who needs them, and the streaming text itself is the only loading
// signal a visitor needs.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(question?: string) {
    const q = (question ?? input).trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    setSources([]);

    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: "user", text: q }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q, history }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      // Ids of the documents retrieval used, sent before generation so inline
      // citation markers can be stripped as tokens arrive.
      let docIds: string[] = [];

      // Streamed deltas all belong to ONE assistant message, appended in place.
      //
      // Whether a delta opens a new bubble or extends the last one is decided by
      // inspecting state, never by a mutable flag. An earlier version used an
      // `opened` variable set to true right after calling setMessages — but React
      // runs the updater during the next render, by which point the flag was
      // already true, so the first token took the "extend" branch, found a user
      // message rather than a bot one, and appended nothing. The user's message
      // rendered and the bot's never did.
      //
      // The user turn always separates exchanges, so "is the last message a bot
      // message?" is sufficient and needs no external state.
      const append = (text: string) => {
        answer += text;
        // Strip inline citation markers as they stream. They have to be removed
        // here rather than server-side because a marker can be split across
        // deltas ("[", "bio", "]") and is only recognisable once complete.
        const clean = stripCitations(answer, docIds);
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last?.role === "bot") {
            return [...m.slice(0, -1), { ...last, text: clean }];
          }
          return [...m, { role: "bot", text: clean }];
        });
      };

      const flush = (line: string) => {
        if (!line.startsWith("data:")) return;
        let d: {
          type: string;
          text?: string;
          sources?: string[];
          docIds?: string[];
          message?: string;
          retrievalMode?: string;
          chunksUsed?: number;
          cached?: boolean;
        };
        try {
          d = JSON.parse(line.slice(5).trim());
        } catch {
          return;
        }
        if (d.type === "delta" && d.text) append(d.text);
        else if (d.type === "sources") {
          if (d.sources) setSources(d.sources);
          if (d.docIds) docIds = d.docIds;
        } else if (d.type === "error") append(d.message ?? "Something went wrong.");
        else if (d.type === "done") {
          // Diagnostic only — never rendered. Lets a degraded retrieval path be
          // spotted in devtools without putting instrumentation in the UI.
          console.info(`[rag] ${d.retrievalMode} | ${d.chunksUsed} chunks | cached=${d.cached}`);
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const f of frames) flush(f);
      }
      if (buffer.trim()) flush(buffer);
      if (!answer) throw new Error("empty response");
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Something went wrong — email terry.perangat@gmail.com instead." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed right-5 bottom-5 z-50 md:right-10 md:bottom-10">
      {open && (
        <div className="film-grain mb-4 flex h-[30rem] w-[21rem] flex-col overflow-hidden rounded-xl border border-bone/12 bg-ink-2/95 shadow-2xl backdrop-blur-sm sm:w-[23rem]">
          {/* Conversation is the panel. Everything else is a thin control. */}
          <div className="flex items-start gap-3 px-5 pt-4 pb-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
            <p className="flex-1 text-sm text-bone-dim">Ask about Terry's work.</p>
            <div className="-mt-0.5 flex shrink-0 items-center gap-3 text-xs text-bone-dim/50">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setSources([]);
                  }}
                  className="transition-colors hover:text-ember"
                >
                  New
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="transition-colors hover:text-ember"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-5 py-3">
            {messages.length === 0 ? (
              <div className="space-y-1 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="block text-left font-editorial text-base leading-relaxed text-bone-dim/70 transition-colors hover:text-ember"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i}>
                  <p
                    className={
                      m.role === "user"
                        ? "font-editorial text-lg leading-snug text-bone/90"
                        : "font-editorial text-lg leading-relaxed text-bone-dim"
                    }
                  >
                    {m.text}
                  </p>
                  {m.role === "bot" && i === messages.length - 1 && sources.length > 0 && !busy && (
                    <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-bone-dim/40">
                      {sources.map((s) => (
                        <a key={s} href={s} className="transition-colors hover:text-ember">
                          {s.replace("#", "")}
                        </a>
                      ))}
                    </p>
                  )}
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2 border-t border-bone/10 px-4 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask, or follow up…"
              aria-label="Ask about Terry's work"
              className="min-w-0 flex-1 bg-transparent text-sm text-bone placeholder:text-bone-dim/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="shrink-0 text-sm text-bone-dim/50 transition-colors hover:text-ember disabled:opacity-30 disabled:hover:text-bone-dim/50"
            >
              ↵
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="label-eyebrow rounded-full border border-bone/25 bg-ink px-5 py-3 text-bone transition-colors hover:border-ember hover:text-ember"
      >
        {open ? "Close" : "Ask about my work"}
      </button>
    </div>
  );
}
