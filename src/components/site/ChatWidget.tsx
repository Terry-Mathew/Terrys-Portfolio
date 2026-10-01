import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

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

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  /** Source anchors this answer used. Carried on the message, not in one piece
   *  of component state, so a completed answer keeps its own citations when a
   *  later turn replaces the panel's source list. */
  sources?: string[];
  /** The turn failed. Kept separate from the text so Retry can be offered and
   *  a partial answer is not mistaken for a failure. */
  failed?: boolean;
  /** Set while a stream is still open for this message. */
  pending?: boolean;
};

/**
 * The turn's internal state machine.
 *
 * Ten states, held in a ref and never rendered. The UI shows exactly two
 * strings, because `searching` → `retrieved` → `generating` arrive tens of
 * milliseconds apart on a fast network and three flashes of status text read as
 * a glitch rather than as progress. The granularity is still useful: it is what
 * distinguishes "still working" from "stuck", and what decides whether an error
 * is worth showing the visitor at all.
 */
type ChatState =
  | "idle"
  | "composing"
  | "sending"
  | "searching"
  | "retrieved"
  | "generating"
  | "streaming"
  | "degraded"
  | "cancelled"
  | "failed";

/** The only two things the visitor is told while a turn runs. */
const STATUS_SENDING = "Sending…";
const STATUS_READING = "Looking through Terry's work…";

/**
 * Minimum time a status label stays on screen before it may change.
 *
 * Without this the two labels swap inside a single frame on a warm connection,
 * which reads as a flicker. A label that has been up for less than this waits
 * out the remainder rather than being replaced.
 */
const MIN_HOLD_MS = 700;

const BLANK_STATE_CHIPS = [
  "What did Terry build at Oracle?",
  "Tell me about Settle.",
  "How does this chatbot work?",
];

/** One boundary check on the scroll behaviour, not one per render. */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m${Math.random().toString(36).slice(2)}`;

// RAG chat widget. Streams tokens from POST /api/chat.
//
// What the visitor sees is deliberately two things: the answer, and whether the
// assistant is currently able to give one. Everything else the stream reports —
// chunk counts, retrieval mode, cache state — stays in the console, because
// "Found 4 relevant sections" is instrumentation, not conversation.
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [statusLabel, setStatusLabel] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // The state machine lives in a ref, not in state: it is read far more often
  // than it changes, and re-rendering the whole panel on every transition is
  // what makes a status line feel like it is flickering.
  const stateRef = useRef<ChatState>("idle");
  const setState = useCallback((s: ChatState) => {
    stateRef.current = s;
  }, []);

  const statusRef = useRef({ label: "", at: 0 });
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Show a status label, honouring the minimum hold. */
  const setStatus = useCallback((label: string) => {
    const cur = statusRef.current;
    if (cur.label === label) return;
    if (statusTimer.current) clearTimeout(statusTimer.current);
    const wait = MIN_HOLD_MS - (Date.now() - cur.at);
    const apply = () => {
      statusRef.current = { label, at: Date.now() };
      setStatusLabel(label);
    };
    if (wait <= 0) apply();
    else statusTimer.current = setTimeout(apply, wait);
  }, []);

  const clearStatus = useCallback(() => {
    if (statusTimer.current) {
      clearTimeout(statusTimer.current);
      statusTimer.current = null;
    }
    statusRef.current = { label: "", at: Date.now() };
    setStatusLabel("");
  }, []);

  /**
   * Scroll to the newest message, but only while the visitor is already at the
   * bottom.
   *
   * Auto-scrolling on every token yanks the page out from under anyone reading
   * back through the conversation — they scroll up to re-read something, and
   * the panel slides to the bottom again on the next token. The check is the
   * difference between "keeps up with the answer" and "argues with you".
   */
  const pinnedToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      pinnedToBottom.current = distance < 48;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  useEffect(() => {
    if (!pinnedToBottom.current) return;
    endRef.current?.scrollIntoView({
      // Guarded rather than unconditional: a smooth scroll is an animation the
      // visitor did not ask for, and the stylesheet already collapses
      // transition durations under reduced-motion — this is the scroll API, so
      // it needs its own check.
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, busy, statusLabel]);

  // The contact section already carries the email address, the social links and
  // the footer, so the floating button is redundant there — and it was sitting
  // on top of them. `visibility` rather than a bare opacity change so the
  // button leaves the tab order and the accessibility tree the moment it
  // hides, instead of fading out while still focusable.
  const [overContact, setOverContact] = useState(false);
  useEffect(() => {
    const contact = document.getElementById("contact");
    if (!contact) return;
    const io = new IntersectionObserver(
      ([entry]) => setOverContact(entry?.isIntersecting ?? false),
      { rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(contact);
    return () => io.disconnect();
  }, []);

  const docked = overContact && !open;

  // ---- health ----------------------------------------------------------
  //
  // Read once per open, not on an interval. The flag is TTL'd at ten minutes
  // server-side and a live `warning` event flips it mid-turn, so polling would
  // add a request per panel open to learn something the next turn will tell us.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/chat", { signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .then((raw: unknown) => {
        const d = raw as { degraded?: boolean } | null;
        if (!cancelled && d && typeof d.degraded === "boolean") setDegraded(d.degraded);
      })
      .catch(() => {
        // A status check that cannot run must not stop the panel opening. The
        // server treats a missing flag as "available" for the same reason.
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ---- a11y: focus, Escape, trap ---------------------------------------

  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /**
   * Closing stops an in-flight turn.
   *
   * Not just tidiness: the request is already being paid for by the time the
   * visitor closes the panel, and cancelling stops the provider chain before it
   * spends the failover. Whatever had already streamed stays in the transcript,
   * so reopening shows the conversation rather than a spinner that will never
   * resolve.
   */
  const close = useCallback(() => {
    cancel();
    setOpen(false);
  }, [cancel]);

  useEffect(() => {
    if (!open) return;
    // Captured before focus moves, or the "where was I" target is the composer
    // we are about to focus. The trigger is copied out for the same reason: a
    // ref read inside the cleanup would be read after unmount, which is the one
    // moment it has to be right.
    const previous = document.activeElement as HTMLElement | null;
    const trigger = triggerRef.current;

    // Focus moves into the panel on open and back to the trigger on close.
    // Without the second half, closing the panel drops a keyboard user at the
    // top of the document with no idea where they were.
    //
    // The composer is focused only on a fine pointer. On touch, focusing a
    // textarea opens the soft keyboard over the answer the visitor just came to
    // read, which is worse than the extra Tab.
    if (typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches) {
      composerRef.current?.focus();
    } else {
      panelRef.current?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, a[href], summary, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // `previous` is usually the composer, which is unmounted by the time this
      // runs — focusing a detached node is a silent no-op, which left Escape
      // dropping keyboard users at the top of the document. If it is gone, go
      // back to the trigger that opened the panel.
      const target = previous && document.contains(previous) ? previous : trigger;
      target?.focus?.();
    };
  }, [open, close]);

  // ---- sending ---------------------------------------------------------

  /**
   * @param question     what to ask; defaults to the composer
   * @param knownHistory conversation to send. Supplied by Retry, which has
   *   already trimmed the failed turn out of `messages` — reading it from state
   *   there would resend the error message as if the model had said it.
   */
  async function send(question?: string, knownHistory?: { role: "user" | "bot"; text: string }[]) {
    const q = (question ?? input).trim();
    if (!q || busy) return;

    const userId = newId();
    const botId = newId();

    // Both messages exist before the request starts, and the assistant one
    // carries the id the stream writes into.
    //
    // The previous version decided whether a delta opened a new bubble or
    // extended the last one by inspecting React state during the updater, with
    // a mutable flag set before the updater ran. React runs that updater on the
    // next render, so the first token took the "extend" branch, found a user
    // message, and appended nothing — the visitor's question rendered and the
    // answer never did. An id removes the question entirely.
    const history = knownHistory ?? messages.slice(-6).map(({ role, text }) => ({ role, text }));
    setMessages((m) => [
      ...m,
      { id: userId, role: "user", text: q },
      { id: botId, role: "bot", text: "", pending: true },
    ]);
    setInput("");
    setBusy(true);
    setState("sending");
    pinnedToBottom.current = true;
    setStatus(STATUS_SENDING);

    const controller = new AbortController();
    abortRef.current = controller;
    // Two deadlines. `timeoutMs` is the request budget; `cancelTimeout` is the
    // window a *partial* answer gets before the panel stops waiting and offers
    // Retry, which is a different outcome from "no answer at all".
    const timeout = setTimeout(() => controller.abort(), 30000);
    const cancelTimeout = setTimeout(() => controller.abort(), 55000);

    let answer = "";
    let docIds: string[] = [];
    let sawDelta = false;
    /** A terminal error event already set the message text. */
    let reported = false;

    const patch = (id: string, changes: Partial<Message>) =>
      setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, ...changes } : msg)));

    const finish = () => {
      clearTimeout(timeout);
      clearTimeout(cancelTimeout);
      if (abortRef.current === controller) abortRef.current = null;
      clearStatus();
      setBusy(false);
      setState("idle");
      pinnedToBottom.current = true;
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q, history }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const flush = (frame: string) => {
        // `:hb` heartbeat comments keep the connection alive through a slow
        // provider tier. They are SSE comments, not data frames, and parsing
        // one as JSON would throw on every heartbeat.
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) return;
        let d: {
          type: string;
          phase?: string;
          text?: string;
          sources?: string[];
          docIds?: string[];
          retrievalMode?: string;
          chunksUsed?: number;
          cached?: boolean;
          generation?: string;
          provider?: string;
          message?: string;
          answer?: string;
          degraded?: boolean;
        };
        try {
          d = JSON.parse(line.slice(5).trim());
        } catch {
          return;
        }

        switch (d.type) {
          case "phase":
            if (d.phase === "searching") setState("searching");
            else if (d.phase === "retrieved") {
              setState("retrieved");
              setStatus(STATUS_READING);
            }
            break;

          case "sources":
            // The last event before generation starts, which is the real
            // boundary: everything above this line is retrieval.
            if (d.sources) {
              setState("generating");
              patch(botId, { sources: d.sources });
            }
            if (d.docIds) docIds = d.docIds;
            break;

          case "delta": {
            if (!d.text) return;
            if (!sawDelta) {
              sawDelta = true;
              setState("streaming");
              // Hold the status for the rest of the minimum window, then drop
              // it. Clearing on the first token instead is what made the line
              // strobe on a fast connection.
              if (statusTimer.current) clearTimeout(statusTimer.current);
              statusTimer.current = setTimeout(() => {
                statusRef.current = { label: "", at: Date.now() };
                setStatusLabel("");
              }, MIN_HOLD_MS);
            }
            answer += d.text;
            // Strip inline citation markers as they stream. They have to be
            // removed here rather than server-side because a marker can be
            // split across deltas ("[", "bio", "]") and is only recognisable
            // once complete.
            patch(botId, { text: stripCitations(answer, docIds) });
            break;
          }

          case "warning":
            setDegraded(true);
            break;

          case "cancelled":
            setState("cancelled");
            break;

          case "error":
            setState("failed");
            reported = true;
            patch(botId, {
              text: d.message ?? "Something went wrong — email terry.perangat@gmail.com instead.",
              failed: true,
              pending: false,
            });
            break;

          case "done": {
            console.info(
              `[rag] ${d.retrievalMode} | ${d.chunksUsed} chunks | cached=${d.cached} | ${d.provider ?? d.generation}`,
            );
            // The server decides this. It can tell a fallback answer apart from
            // a turn that never needed the pipeline; the client cannot.
            setDegraded(d.degraded === true);
            setState(d.degraded === true ? "degraded" : "idle");
            // Not every reply streams. Rate-limited and extractive responses
            // send no deltas — the answer exists only here. Without this the
            // widget throws "empty response" and replaces a perfectly good
            // reply with an error, which is what a visitor sees whenever the
            // model tiers are capped.
            if (!answer && d.answer) {
              answer = d.answer;
              patch(botId, { text: stripCitations(answer, docIds) });
            }
            break;
          }
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

      // `reported` guards the one case the error event already handled: without it,
      // a terminal `error` set the message and then this threw "empty response"
      // and replaced it with the generic string.
      if (!answer && !reported) throw new Error("empty response");
      patch(botId, { pending: false });
    } catch (error) {
      // A cancelled turn and a failed turn used to share one handler, so
      // hitting Cancel rendered "Something went wrong" — the panel told the
      // visitor it had failed at the moment they had asked it to stop.
      const cancelled =
        controller.signal.aborted || (error instanceof Error && error.name === "AbortError");

      if (cancelled) {
        setState("cancelled");
        // Keep whatever already streamed. Half an answer is worth more than
        // none, and throwing it away to show "Something went wrong" discards
        // real work the visitor was reading a moment ago.
        if (answer) patch(botId, { text: stripCitations(answer, docIds), pending: false });
        else setMessages((m) => m.filter((msg) => msg.id !== botId || msg.role !== "bot"));
      } else {
        console.error("[rag] turn failed", error);
        setState("failed");
        patch(botId, {
          text: answer
            ? stripCitations(answer, docIds)
            : "Something went wrong — email terry.perangat@gmail.com instead.",
          // Only mark it failed when there is nothing to read. A partial answer
          // with an error flag next to it reads as "this is broken" even when
          // most of it is intact.
          failed: !answer,
          pending: false,
        });
      }
    } finally {
      finish();
    }
  }

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Retry replaces the failed turn rather than stacking a duplicate of the
    // question below the error it is meant to answer. The trimmed list is also
    // the history sent, so the error text is never fed back in as if the model
    // had produced it.
    const cut = messages.findIndex((m) => m.id === lastUser.id);
    const kept = messages.slice(0, cut);
    setMessages(kept);
    void send(
      lastUser.text,
      kept.slice(-6).map(({ role, text }) => ({ role, text })),
    );
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // On a phone the soft keyboard's Enter is a newline by platform
      // convention, and overriding it is hostile — so the send path is also on
      // the button, and the hint below the composer says which is which.
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      void send();
    }
  };

  return (
    <div
      className={`safe-fab fixed z-40 transition-[opacity,visibility] duration-300 ${
        docked ? "invisible opacity-0" : "visible opacity-100"
      }`}
    >
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
          aria-label="Ask about Terry's work"
          className={`film-grain chat-sheet md:chat-panel mb-4 flex flex-col overflow-hidden rounded-xl border border-bone/12 bg-ink-2/95 shadow-2xl backdrop-blur-sm`}
        >
          {/* Conversation is the panel. Everything else is a thin control. */}
          <div className="flex items-start gap-3 px-5 pt-4 pb-2">
            <span
              aria-hidden="true"
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                degraded ? "bg-bone-dim/50" : "bg-ember"
              }`}
            />
            <div className="flex-1">
              <p className="text-sm text-bone-dim">Ask about Terry&rsquo;s work.</p>
              {/* Diagnostic only. What it buys is the absence of a lie: a chat
                  that is answering from a keyword table and a model that is
                  rate-limited still renders, and without this the visitor has
                  no way to tell a good answer from a fallback one. */}
              <p className="mt-0.5 text-[0.6875rem] text-bone-dim/50">
                {degraded ? "● Limited mode" : "● Available"}
              </p>
            </div>
            <div className="-mt-0.5 flex shrink-0 items-center gap-3 text-xs text-bone-dim/50">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setState("idle");
                    clearStatus();
                  }}
                  className="transition-colors hover:text-ember"
                >
                  New
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Close chat"
                className="transition-colors hover:text-ember"
              >
                ✕
              </button>
            </div>
          </div>

          {/* role="log" so a screen reader announces answers as they arrive
              rather than only when the conversation is finished with. */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label="Conversation"
            className="flex-1 space-y-5 overflow-y-auto px-5 py-3"
          >
            {messages.length === 0 ? (
              <div className="pt-2">
                <p className="font-editorial text-[0.9375rem] leading-relaxed text-bone">
                  Hi traveller. I&rsquo;m Terry&rsquo;s digital twin — ask me about the work, the
                  projects, or the parts he can just tell you in person.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-bone-dim">
                  Want him to get back to you? Leave a name and an email and I&rsquo;ll pass it on.
                </p>
                <ul className="mt-5 space-y-2">
                  {BLANK_STATE_CHIPS.map((chip) => (
                    <li key={chip}>
                      <button
                        type="button"
                        onClick={() => void send(chip)}
                        className="w-full rounded-sm border border-bone/12 px-3 py-2 text-left text-sm text-bone-dim transition-colors hover:border-ember/50 hover:text-bone"
                      >
                        {chip}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((m) =>
                m.role === "user" ? (
                  <p
                    key={m.id}
                    className="font-editorial text-[0.9375rem] leading-snug text-bone/90"
                  >
                    {m.text}
                  </p>
                ) : (
                  <div key={m.id}>
                    <p className="max-w-[40ch] font-editorial text-[0.9375rem] leading-relaxed text-bone-dim">
                      {m.text}
                      {m.pending && (
                        <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-ember/60" />
                      )}
                    </p>
                    {m.failed && (
                      <p className="mt-2 text-xs text-bone-dim/50">
                        <button
                          type="button"
                          onClick={retry}
                          className="transition-colors hover:text-ember"
                        >
                          Retry
                        </button>
                      </p>
                    )}
                    {/* Sources belong to the message they came from. As one
                        piece of component state they were overwritten by the
                        next turn, so an answer that used four sections lost
                        them the moment anything was asked again. */}
                    {m.sources && m.sources.length > 0 && (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer list-none text-xs text-bone-dim/40 transition-colors hover:text-ember">
                          Sources ({m.sources.length})
                        </summary>
                        <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-bone-dim/40">
                          {m.sources.map((s) => (
                            <a key={s} href={s} className="transition-colors hover:text-ember">
                              {s.replace(/^#/, "").replace(/^\//, "")}
                            </a>
                          ))}
                        </p>
                      </details>
                    )}
                  </div>
                ),
              )
            )}
            <div ref={endRef} />
          </div>

          {/* Status line. `aria-live` so the state of the turn is announced, and
              separate from the conversation log so a screen-reader user is not
              interrupted by "Sending…" between every pair of messages. */}
          <p
            aria-live="polite"
            aria-atomic="true"
            className="min-h-5 px-5 text-xs text-bone-dim/60"
          >
            {statusLabel}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="border-t border-bone/10 px-4 pt-3 pb-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={input}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  setState("composing");
                  // Auto-grow to the content, capped, then scroll. A fixed
                  // height would hide the tail of a long question behind a
                  // scrollbar the visitor has to find.
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
                }}
                onKeyDown={onComposerKeyDown}
                placeholder="Ask, or follow up…"
                aria-label="Ask about Terry's work"
                className="max-h-36 min-h-[2.25rem] flex-1 resize-none overflow-y-auto rounded-sm bg-transparent py-1.5 text-sm text-bone placeholder:text-bone-dim/40"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={cancel}
                  aria-label="Stop generating"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-bone/25 text-xs text-bone-dim transition-colors hover:border-ember hover:text-ember"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-bone-dim transition-opacity hover:text-ember disabled:cursor-default disabled:opacity-30 disabled:hover:text-bone-dim"
                >
                  {/* The label carries the action at desktop widths, where the
                      glyph alone read as "submit" in a form with no other
                      affordance. Below that there is no room for it. */}
                  <span className="hidden md:inline md:px-1 md:text-xs md:tracking-wide">Send</span>
                  <ArrowUp aria-hidden="true" className="size-4 md:hidden" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[0.6875rem] text-bone-dim/35">
              Enter to send · Shift+Enter newline
            </p>
          </form>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label="Ask about Terry's work"
        className="label-eyebrow inline-flex min-h-11 items-center rounded-full border border-bone/25 bg-ink px-5 py-3 text-bone transition-colors hover:border-ember hover:text-ember focus-visible:bg-ember/15"
      >
        {open ? "Close" : "Ask about my work"}
      </button>
    </div>
  );
}
