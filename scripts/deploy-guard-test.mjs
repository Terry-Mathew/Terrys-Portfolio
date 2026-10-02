// Guards for the deploy workflow's two weakest steps.
//
//   npm run test:deploy
//
// Both of these were wrong in production and both were invisible:
//
//   1. The notification step ran `set +e`, sent the request, and printed the
//      response without reading it. A wrong Pushover token answered
//      `{"token":"invalid"}`, the step went green, and no notification arrived.
//      Deploys had been finishing silently with nothing in the run to say so.
//
//   2. The live-version check accepted any response containing the string
//      `"type"`. Every build of `/api/chat` has emitted that since the route
//      existed, so a stale or unpromoted version passed. When the version-5
//      build was deployed, this step reported success while the previous build
//      was still serving traffic, and the fingerprint had to be checked by hand.
//
// The workflow is not runnable here, so these assert on its text. They are
// worth having because the failure mode of both is a check that appears to
// work: nothing goes red, and the thing the check exists to catch happens.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(ROOT, ".github", "workflows", "deploy.yml"), "utf8");

/** The `run:` body of one named step. */
function stepBody(name) {
  const start = raw.indexOf(`- name: ${name}`);
  assert.ok(start > -1, `step "${name}" not found in deploy.yml`);
  const runStart = raw.indexOf("run: |", start);
  assert.ok(runStart > -1, `step "${name}" has no run: | block`);
  const from = runStart + "run: |".length;
  const next = raw.indexOf("\n      - name:", from);
  return raw.slice(from, next > -1 ? next : raw.length);
}

const verify = stepBody("Verify the deployed version is live");
const notify = stepBody("Notify (deploy succeeded)");
const probe = stepBody("Probe semantic retrieval");
const evaluate = stepBody("Evaluate the deployed chatbot");

// ------------------------------------------ 1. the deploy must check the build

test("the live-version check accepts more than the string 'type'", () => {
  // The whole defect in one line. Every build has emitted this.
  assert.equal(
    /grep -q\s+['"]"type"['"]/.test(verify),
    false,
    'the check still accepts any response containing "type", which every build emits',
  );
});

test("the live-version check requires the current stream contract", () => {
  // These are the markers the version-5 build added. An older build fails the
  // first four and cannot get through.
  for (const marker of [
    '"type":"started"',
    '"type":"phase"',
    '"type":"sources"',
    '"type":"done"',
    '"timings"',
    '"provider"',
  ]) {
    assert.ok(verify.includes(marker), `the contract check is missing ${marker}`);
  }
});

test("the check names the markers it is looking for in one place", () => {
  // Six markers copied across the file drift. One variable with a comment
  // saying to update it is the cheapest way to keep them honest.
  assert.match(verify, /MARKERS=/, "the markers should be declared once");
  assert.match(verify, /Update this list when the stream contract changes/);
});

test("a contract mismatch fails the deploy", () => {
  // A check that warns cannot catch anything.
  assert.match(verify, /::error::[^\n]*does not match the current stream contract/);
  assert.match(verify, /exit 1/);
});

test("the retry loop reports the missing markers instead of dying on a grep", () => {
  // The old loop only knew "no response". Now it has to say which part of the
  // contract was absent, or a future mismatch is as opaque as the original.
  assert.match(verify, /missing/);
  assert.match(verify, /contract mismatch/);
});

test("the probe reads the done event rather than any event", () => {
  // The probe's retry gate had the same weakness as the verify step.
  assert.equal(/grep -q\s+['"]"type"['"]/.test(probe), false);
  assert.match(probe, /grep -qF '"type":"done"'/);
});

// --------------------------------------- 2. a notification failure must show

test("the notification step reads the Pushover response", () => {
  assert.match(notify, /grep -qF '"status":1'/, "the success field is never checked");
  // Capture, not just print. Writing `curl -o /dev/null` and leaving
  // `echo "pushover: $resp"` in place would satisfy every other assertion here
  // while reading an empty variable — which is the original defect wearing a
  // different hat.
  assert.match(notify, /resp=\$\(curl/, "the response must be captured to inspect it");
  assert.match(notify, /pushover: \$resp/, "the response must be printed, for diagnosis");
  // The captured value must reach a conditional, not only the log.
  const after = notify.slice(notify.indexOf("pushover: $resp"));
  assert.match(after, /grep -qF '"status":1'/, "the decision must use the captured response");
});

test("a failed notification produces a visible warning", () => {
  assert.match(
    notify,
    /::warning::[^\n]*NO notification was sent/,
    "a broken token must not produce a green step",
  );
});

test("a missing token is reported before any request is made", () => {
  // Sending an empty token produces a confusing API error instead of naming the
  // actual problem.
  assert.match(notify, /-z "\$PUSHOVER_TOKEN"/);
  assert.match(notify, /gh secret set PUSHOVER_TOKEN --env production/);
});

test("a notification failure still does not fail the deploy", () => {
  // The site is already live by this point, so failing here would report a
  // green deploy as red. The fix is visibility, not blocking.
  assert.match(notify, /set \+e/);
  const beforeSetE = notify.slice(0, notify.indexOf("set +e"));
  const errorAnns = [...notify.matchAll(/::error::/g)].length;
  assert.equal(errorAnns, 0, "the notify step must not raise an error annotation");
  assert.ok(beforeSetE.length < notify.length);
  // Every failure path exits 0 rather than falling through to a non-zero.
  assert.match(notify, /exit 0/);
});

test("the token is read from the environment, not interpolated into the command", () => {
  // It is also in `env:`. Using it in the command line puts it in the process
  // table, where GitHub's log masking does not help.
  assert.equal(
    /--data-urlencode "token=\$\{\{ secrets/.test(notify),
    false,
    "the secret is interpolated into the command line instead of read from env",
  );
  assert.match(notify, /--data-urlencode "token=\$PUSHOVER_TOKEN"/);
});

// -------------------------------------- 3. the probe should catch degradation

test("the probe fails the deploy when the answer came from a fallback", () => {
  assert.match(probe, /"degraded":\(true\|false\)/);
  assert.match(probe, /\[ "\$deg" = "true" \]/);
  assert.match(probe, /::error::[^\n]*fallback/);
});

test("the probe reports the per-method retrieval health", () => {
  // `retrievalMode` alone cannot separate "the index answered" from "one
  // method failed and the other covered". The health object can.
  assert.match(probe, /"health":\\\{/);
});

// --------------------------------- 4. the parts that were already right

test("the eval gate still blocks on availability and warns on content", () => {
  // The step reads the suite's exit code and branches on the class. Availability
  // blocks; content warns. Both branches must still be here, or the gate is
  // decorative.
  assert.match(evaluate, /::error::[^\n]*AVAILABILITY failure[^\n]*blocks the deploy/);
  assert.match(evaluate, /::warning::[^\n]*does not block the deploy/);
  assert.match(evaluate, /::notice::Evaluation passed in full/);

  // And the blocking branch must actually exit non-zero, not merely say so.
  const branches = evaluate.split(/\n\s{2}\d\)\s*$/m);
  const blocking = evaluate.slice(
    evaluate.indexOf("AVAILABILITY failure"),
    evaluate.indexOf("esac"),
  );
  assert.match(blocking, /exit 1/, "the availability branch must exit non-zero");
  assert.equal(branches.length > 0, true);
});

test("the workflow still runs the eval after the deploy, not before", () => {
  const evalAt = raw.indexOf("- name: Evaluate the deployed chatbot");
  const deployAt = raw.indexOf("- name: Deploy to Cloudflare");
  const ingestAt = raw.indexOf("- name: Ingest the knowledge corpus");
  assert.ok(deployAt > -1 && ingestAt > deployAt, "ingest must follow the deploy");
  assert.ok(evalAt > ingestAt, "the eval must run last, against the deployed code");
});

test("the ingest still refuses to pass when the corpus did not load", () => {
  const ingest = stepBody("Ingest the knowledge corpus");
  assert.match(ingest, /::error::[^\n]*INGEST_KEY is not set/);
  assert.match(ingest, /Corpus ingest did not succeed/);
});
