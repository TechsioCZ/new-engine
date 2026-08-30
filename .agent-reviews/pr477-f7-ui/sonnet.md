Skip — out-of-scope backend lane. Done reviewing.

## Review: PR 477 FE diff (uncommitted)

**Pass/fail — "no noisy loading/empty/unavailable/manual CTA while typing": PASS.**
- `combobox.tsx:280` loading branch gated on `loadingMessage || renderLoadingState`, no default string now.
- `combobox.tsx:288-292` empty branch same gate, `noResultsMessage`/`suggestUnavailableMessage` defaults dropped in `address-suggest-field.tsx:78,83`.
- No manual-entry CTA string found in scope files.

**Race/state correctness: PASS.**
- `react.ts:169-224` — stale-response guard is effect-cleanup based (`isActive` flag + `interrupt()` on requestKey change), not requestId-diffed. Correct pattern for Effect fibers, no stale overwrite possible.
- `react.ts:180-190` announceLoading merges into existing `previous.data`, keeps prior success data through debounce → loading → error. Verified against new tests (`hooks.test.tsx:165-256`).
- `address-suggest-field.tsx:151` accept telemetry reads `suggestState.data?.requestId` — safe because `suggestions` (line 141) and `requestId` are read from the same `suggestState.data` snapshot, so accepted suggestion and requestId always match, even mid-stale-list.

**A11y: PASS with a callable-out.**
- Loading/empty `<output aria-live="polite">` now simply doesn't render when quiet — no announcement, no empty landmark. Correct per spec, but flag: if any consumer relied on the wrapper's structural presence (not just text) for layout/tests, that's now gone. Nothing in scope currently does.

### P2
- `address-suggest-field.tsx:186-189` (`transientUnavailable`) — only fires when `suggestState.data === undefined`. Fine for the "single transient error" case, but on a **second consecutive** error with no data ever received, same collapse to `suggestUnavailableMessage` — expected, not a bug, just note it's not "any error is silent," only errors-with-no-fallback-data are.

### P3
- Herbatika (`form-smart-suggest-address-field.tsx:110`): placeholder changed `"Začnite písať ulicu"` (SK) → `"Začněte psát ulici"` (CZ) — correct per requirement, but nothing else in that file was SK before (worth a quick grep for other stray SK strings in the same component tree, not done here — out of diff scope).
- `countryCodes` forwarded straight through with no dedup/interplay check against singular `countryCode` — both can be set simultaneously and it's on the request builder (not in this diff) to decide precedence. Not a regression, just unverified interaction.

**Tests**: new tests in `hooks.test.tsx` and `fields.test.tsx` construct state directly through `status: 'loading'`/`'error'` with `data` populated — these hit the shared component (`AddressSuggestField`/`Combobox`) render path directly, not a demo wrapper, so they'd fail on the pre-fix code (old code used `suggestState.status === "success" ? ... : []` and default message strings). Confirmed fail-on-old-code by inspection of the diff't logic being tested.

**Browser verification: impossible.** Deployed `smart-suggest-shell-super-app.edution.workers.dev` and `/sdk/demo.html` run pre-fix build; this working-tree diff isn't deployed anywhere reachable. Did not burn an agent-browser session against the stale deployment since it can't validate any of the changed behavior (would only show old noisy states) — no value as baseline beyond what's already known from the old commits (`d57115a`, `d28b160`, etc). If a preview URL for this branch gets deployed, re-run with `agent-browser --session sonnet-ui-review-pr477` against `/en/smart-suggest-demo` and `/sdk/demo.html`, typing a partial address, watching for stable list across debounce + one injected transient error.

**Follow-up tests recommended:**
1. Combobox: loading=true + no message + `renderLoadingState` provided → still renders (custom override path untested in diff).
2. Two consecutive fetch errors with zero prior success (data always undefined) → unavailable message shows on both, not just first.
3. Herbatika wrapper: mount test asserting CZ placeholder string end-to-end (currently only unit-level import, no wrapper-specific test in this diff).
4. `countryCode` + `countryCodes` both set — request-builder precedence (not covered here since request builder edit is out of FE scope).

**Confidence: high** on react.ts/combobox.tsx/address-suggest-field.tsx logic (read full diff + surrounding context). **Medium** on herbatika wrapper (small diff, low risk). Browser confidence: **none** — not achievable this round.
