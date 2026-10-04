# Terry Portfolio — agent notes

- Stack: TanStack Start (SSR) + React 19 + Vite + Tailwind CSS v4. No Lovable dependency.
- Deploy target: Cloudflare Workers (Nitro `cloudflare` preset). See `wrangler.jsonc` (placeholder — adjust before first deploy).
- Photo/print sizing that depends on window height (e.g. `experience-print`, `short:` variant) lives in `src/styles.css` as an `@utility`/`@custom-variant`, not as an arbitrary Tailwind value. Nested `calc()`/`min()` inside `w-[…]`/`h-[…]` is silently dropped by the compiler, and a caption inside a `w-fit` mount makes the mount size to the text instead of the photo. Keep the mount hugging the print and put long handwritten captions on the paper below it.
- Placeholders (owner to replace with real assets): `public/icon.svg`, `public/og-placeholder.svg`, `public/site.webmanifest`, `src/content/knowledge/*.md` (RAG source).
- `private/Terry-Mathew-CV.pdf` is the private resume source. Git ignores the private PDF. `scripts/extract-cv.mjs` updates `src/content/knowledge/resume.md` during builds when the private source is newer. Edit the private PDF, not the generated Markdown. Without the private source, the script keeps the checked-in knowledge. The public resume download was intentionally removed. `src/server/ingest.ts` maps `resume.md` to the `experience` category. Resume citations point to `#experience`.
- Source links in the chatbot are typed by hand into `CATEGORY` and were wrong three times before `scripts/pipeline-test.mjs` started checking each value against the section ids, routes and `public/` assets that actually exist. Adding a `.md` file without a valid `CATEGORY` entry falls back to the obvious `#knowledge` placeholder rather than a plausible-looking dead link.

## Reply style: ASD-100 Simplified Technical English

Write **every** reply to this user in ASD-100 Simplified Technical English, however
complex the subject is. Do this even when the subject is code, a bug, a design
decision, or a report. Do not simplify the answer. Change only the words.

This overrides the usual habit of writing the way engineers talk.

### Rules

1. **One idea per sentence.** Split at every "and" that joins two facts.
2. **20 words maximum per sentence.** Aim for 8 to 12. Break long sentences.
3. **Active voice.** "The build failed." Not "The build was failed."
4. **Use common words.** Prefer "use" over "utilise". "Before" over "prior to".
   "After" over "subsequent to". "So" over "therefore". "But" over "however".
   "To" over "in order to". "About" over "regarding".
5. **Use "must" and "will".** Never "shall".
6. **No "and/or".** Write "A, B, or C".
7. **Present tense for procedures.** Use "Run the test." Not "You will have run".
8. **Name the object before a pronoun refers to it.** Do not write "it" or "they"
   before the first mention.
9. **Use one word for one idea.** Do not switch between synonyms in one reply.
10. **Put one topic in one paragraph.** Start a new paragraph for a new topic.
11. **No slang, no idiom, no joke.** No "just", "obviously", "simply", "really".
12. **Write numbers as figures.** "30", not "thirty". "1.2 billion", not "1.2B".
13. **Give a procedure as numbered steps.** One action per step. Start each step
    with a verb.
14. **Do not use a bullet list for a procedure.** Use numbered steps instead.

### Structure

Lead with the answer. State the result first, then the reason.

Use these headings where they fit:

- **Result** — what happened or what is true now.
- **Steps** — numbered, one action each.
- **Reason** — why it happened, in cause-then-effect order.
- **Limits** — what is not known, checked, or done.

### Limits

ASD-100 has an approved word list of about 2,000 words. It is a controlled
document and is not in this repository. Follow the rules above, but do not claim
that a reply is fully certified ASD-100. Say that it follows the ASD-100 style
rules and that the official word list was not checked.

Technical terms are allowed where no approved word exists. Keep them in the
approved order where the list has one. Give a short explanation on first use.

### Example

Do not write:

> The Pushover token is invalid, which means `Notify (deploy succeeded)` — which
> wraps the curl in `set +e` so it cannot fail the deploy — reports success while
> the notification silently no-ops, and you'd never know deploys stopped
> alerting you.

Write:

> **Result.** Deploy notices do not arrive. The send step still passes.

> **Reason.** The GitHub secret `PUSHOVER_TOKEN` is empty or wrong. The API
> answers `"token":"invalid"`. The step runs the send inside `set +e`. A failure
> there does not stop the step. The step then passes. The log shows green.
> Nobody is told.

> **Steps.**
>
> 1. Set the secret. Run `gh secret set PUSHOVER_TOKEN --env production`.
> 2. Enter the value from the Pushover application page.
> 3. Run the next deploy.
> 4. Check the log for `"status":1`.

> **Limits.** I did not fix this. I did not test a new deploy after you set the
> secret.
