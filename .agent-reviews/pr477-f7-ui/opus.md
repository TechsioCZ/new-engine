Review done. Verdict below.

## PR 477 FE Review — Opus 4.8

**Scope:** 4 source + 3 test/story files. No edits made.

### Behavior verification — PASS

- **Keep-previous-data (debounce+in-flight):** `react.ts:180-190` `announceLoading` reads `previous.data`, retains it on loading flip. Failure path `react.ts:204-212` retains data on error. Field reads suggestions from data not status: `address-suggest-field.tsx:151` `suggestState.data?.suggestions ?? []`. ✓
- **Loading not announced before debounce:** `react.ts:194-196` — `delayMs>0` sleeps *before* `announceLoading`. Hook test asserts `idle` during debounce window. ✓
- **Quiet shared defaults:** combobox defaults now `undefined` (`combobox.tsx:325,327`); branches gated `loading && (loadingMessage||renderLoadingState)` (`280`) and `!hasOptions && inputValue && (noResultsMessage||renderEmptyState)` (`288-292`). Field defaults `noResultsMessage`/`suggestUnavailableMessage` → undefined (`address-suggest-field.tsx:79,85`). ✓
- **Transient error keeps list:** `transientUnavailable` only set when `status==="error" && data===undefined` (`address-suggest-field.tsx:186-188`); `error={transientUnavailable ?? error}` (`193`). Previous data present → no unavailable UX. ✓
- **requestId/accept telemetry consistency:** both `suggestions` and `requestId` sourced from same `suggestState.data` (`151`, `152`). When stale data retained, accepted suggestion + requestId belong to same response. Consistent. ✓
- **Race/abort/stale-overwrite:** per-effect `isActive` closure + `interrupt()` in cleanup (`react.ts:220-223`); `onExit` guards `if (!isActive) return`. React runs cleanup before next effect → stale response cannot overwrite. Dep `requestKey` prevents needless refetch. ✓
- **Herbatika wrapper:** `countryCodes` forwarded independently (`form:87` → field), `countryCode` still via `toCountryCode`. Field scopes both cleanly into request (`address-suggest-field.tsx:98-103`). CZ placeholder `Začněte psát ulici` (was SK `Začnite písať`). ✓
- **Tests hit shared path (not demo-only):** `fields.test.tsx` renders real `AddressSuggestField`, asserts `comboboxProps` loadingMessage/noResultsMessage/error undefined + items retained on loading/error. Would fail on old `status==="success"?...:[]` + hardcoded-default path. ✓

### "No noisy loading/empty/unavailable/manual CTA while typing" → **PASS**

### Findings

- **P3 — a11y regression trade-off** `combobox.tsx:280`: quiet loading with no prior items renders `null` → no `aria-live` region at all during first-keystroke fetch. SR users get zero feedback. Intended "quiet," but consider visually-hidden polite status or spinner. Follow-up, not blocking.
- **P3 — empty popup** `combobox.tsx:302`: loading + no items + inputValue → all branches skip, returns `null`. If Zag opens popup, dropdown box renders empty/no-content. Verify popup stays closed until items exist (layout/flicker).
- **P3 — stale-label telemetry** `address-suggest-field.tsx:151-152`: retained data means Praha suggestions shown while input is "Brno"; accept logs old `requestId`. Analytics mildly misleading. Accepted per spec; note only.
- **P3 (pre-existing, out of diff)** `react.ts:192`: `requestFn(client, activeRequest, {})` forwards empty options — no `AbortSignal` to `client.suggest`; cancellation relies solely on Effect `interrupt`. Underlying fetch may run to completion. From migration commit `2a0a4edc5`, not this PR.

No P1/P2.

### Browser evidence — IMPOSSIBLE (post-fix)

Deployed `smart-suggest-shell-super-app.edution.workers.dev` runs **pre-fix** build; this diff is uncommitted/undeployed. No local dev server. Post-fix browser verification cannot be done until redeploy. Skipped baseline agent-browser run — pre-fix DOM adds nothing to code-level verdict; would only capture the noisy behavior this PR removes.

### Recommended follow-up tests

1. Combobox: `loading=true, items=[], inputValue="P", no messages` → assert popup closed / no empty box rendered.
2. a11y: assert an `aria-live` status still exists (or intentionally absent) during quiet loading.
3. Field: rapid query change Praha→Brno→abort→success — assert only final `requestId` in accept telemetry, no stale overwrite (extends hook race test to the UI layer).
4. Herbatika: render with both `countryCode` and `countryCodes` → assert request carries both, no dedup/conflict.
5. Post-redeploy: browser check on `/en/smart-suggest-demo` + `/sdk/demo.html` — type, trigger transient 5xx, confirm list stays.

**Confidence: high** on code-level verdict (logic + tests traced end-to-end); **n/a** on runtime browser (undeployed).
