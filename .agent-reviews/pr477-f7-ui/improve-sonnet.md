## PR 477 Review — Smart Suggest platform

Verified against master...HEAD (823aff256). All findings below were read against actual line content, not inferred from diff/agent claims alone.

### libs/ui/src/molecules/combobox.tsx

- `libs/ui/src/molecules/combobox.tsx:387-388` — **[P1] Type safety / correctness** — `value: value as string[] | undefined, defaultValue: defaultValue as string[] | undefined` casts unsoundly. `ComboboxProps.value`/`defaultValue` are typed `string | string[]` (lines 188-189), explicitly permitting a plain string for single-select. If a caller passes `value="abc"` as the type allows, the cast lies — Zag's combobox machine receives a raw string typed as `string[]`. Since JS strings are array-like (`"abc"[0]` = `"a"`, `.length` = 3), the machine will treat each character as a separate selected value, corrupting selection state. Fix: normalize at the boundary — `value: value === undefined ? undefined : (Array.isArray(value) ? value : [value])` — or narrow the public prop type to `string[]` only and require callers to wrap single values themselves.

- `libs/ui/src/molecules/combobox.tsx:405-406` — **[P3] Dead code** — `const { ...restInputProps } = inputProps` destructures nothing out, it's just a full clone. If intentional (to drop a specific key later), the intent isn't visible; otherwise replace with `const restInputProps = inputProps` or drop the indirection entirely.

### libs/smart-suggest/react/src/react.ts

- `libs/smart-suggest/react/src/react.ts:77-80,192` — **[P2] Correctness / dead capability** — `SmartSuggestRequestOptions` declares `signal?: AbortSignal` and `timeoutMs?: number`, but `useAbortableRequest`'s `startRequest = suspend(() => requestFn(client, activeRequest, {}))` always passes a literal `{}` as `requestOptions` — neither field is ever populated. On unmount/re-request, only the Effect fiber is interrupted (`interrupt()`); if `client.suggest`/`validatePhone`/`validatePostal` internally wire `fetch(..., { signal })`, that signal never arrives, so the in-flight network request keeps running to completion after "cancellation." Either thread an `AbortController` through and populate `signal`, or drop the unused fields from the type so it doesn't advertise cancellation support that doesn't exist.

### libs/smart-suggest/storage/src/storage.ts (5825 lines — verified via subagent, spot-checked structure)

- `storage.ts:4246-4266` — **[P1] Correctness/concurrency** — `upsertAddressRecordSubchunk` inserts rows then separately calls `refreshAddressSearchIndexesBatch` (multiple independent D1 statements: FTS delete/insert, token delete/insert) with no `db.batch`/transaction anywhere in the file (confirmed zero hits for `.batch(`/`transaction`). Mid-sequence failure leaves rows inserted with stale/missing search indexes, undetectable by the caller. Wrap insert + index refresh in a single D1 transaction/batch.

- `storage.ts:4509` — **[P1] Correctness/concurrency** — `markAddressRecordTombstoned` does select → update → token-delete → per-id FTS-delete as separate unwrapped statements. A failure after `update` but before cleanup leaves a tombstoned record still discoverable via FTS/search index (fails open, not closed). Batch, or reorder to delete search visibility before flipping the tombstone flag.

- `storage.ts:3264,3594,3648,3730,3778,4016,4051` — **[P2] Type safety** — repeated unsound casts (`row.countryCode as SmartSuggestCountryCode`, `row.status as ImportRunStatus`, etc.) across every row→record mapper, none validating the TEXT column against its literal union at read time. Add a small runtime `asLiteral(value, allowed)` guard or route through the Effect `Schema` machinery already used on the artifact path.

- `storage.ts:4872-4893` — **[P2] Correctness (TOCTOU)** — `startImportRun` does select-then-insert-with-onConflict as two statements; concurrent same-id restarts can both pass the pre-check and the second silently overwrites via `onConflictDoUpdate` instead of hitting the intended conflict guard. Use `INSERT ... ON CONFLICT DO NOTHING RETURNING` + follow-up check, or a transaction.

- `storage.ts:4540-4542` — **[P2] Duplication/perf** — per-record FTS delete loop (N+1) duplicates the chunked `deleteAddressSearchFtsRecords` (line 4129) that already exists. Call the existing chunked helper instead.

- `storage.ts:1580-3035 / 3037-3372 / 4092-5396 / 5398-5825` — **[P3] Complexity** — four genuinely separable, non-circular blocks (artifact repo, shard-metadata scoring, D1 repo, in-memory repo) sharing pure row/record converters. Clean split into `storage/{query-helpers,shard-metadata,artifact-repository,d1-repository,in-memory-repository}.ts`.

- Test gap: no test forces partial-failure mid-sequence in the two P1 spots above, and no test feeds `countryCodesFromSuggestCacheKey` a malformed/legacy key — **[P2]**.

### apps/smart-suggest/apps/shell-super-app/api/index.ts (4357 lines — verified via subagent, one finding spot-checked directly by me)

- `api/index.ts:4144-4152, 4166-4174` — **[P2] API design/correctness]** (downgraded from agent's P1 after verification) — `suggestEffect`/`recordAcceptEventEffect` only run `protectBffRequest` (tenant auth + rate limit) `if (request !== undefined)`. I traced both call sites (line 4281, 4286): in the real HTTP wiring, `request` always comes from the Effect `HttpApiBuilder` handler destructure and is never actually undefined in production — so this isn't live-exploitable today. But making `request` optional purely to support internal/test callers means a future direct call (or a refactor of the handler signature) silently drops auth+rate-limiting with no compiler signal. Make `request` required on the production path; add a separately-named unauthenticated variant for tests if needed.

- `api/index.ts:147, 3214-3243` — **[P2] Resource leak** — `providerRegistries` module-level `Map` has no eviction, unlike `workerSuggestCaches` (capped at 500) and the rate-limit bucket maps (capped + trimmed). Grows unbounded per tenant/country/config-JSON combination over isolate lifetime. Add the same trim-on-insert used in `trimRateLimitBuckets`.

- `api/index.ts:2095-2107` — **[P2] Type safety** — `status()` builds via `toJsonCompatible` (returns `unknown`) then `as SmartSuggestStatusResponse` — a raw cast with no shape validation, papering over any drift in the four `summarize*` helpers. Decode through the existing schema instead.

- `api/index.ts:576-580` — **[P2] Type safety** — `readNamedD1Binding` blind-casts `env[bindingName]` to `SmartSuggestD1Binding | undefined` with no runtime shape check; a misconfigured binding name surfaces as a confusing failure deep inside the D1 repository instead of a clear config error.

- `api/index.ts:2903-3081` — **[P3] Duplication** — five `read*ProviderConfig` functions (Mapy, RUIAN, Radar, HERE, Nominatim) repeat the same lookup→required-key→optional-field-assign shape; a 6th provider means another ~25-line copy. Factor into one generic reader driven by a declarative field table.

- `api/index.ts:825-1077` (shard routing) and `1439-1642 + 4229-4341` (CORS + tenant auth) — **[P3] Complexity** — both are clean, self-contained seams (no dependency on request/response HTTP plumbing beyond headers) extractable to their own modules.

- `api/index.ts:3862-3867` — **[P3] Naming** — `blockedCountryScopeResponse`'s requestId is `` `blocked-country-scope-${kind}` ``, not unique per request, useless for log correlation. Use `createTelemetryId` like the rest of the file.

- Test gap: `tests/smart-suggest-bff/http-api.test.ts` (96 lines) never exercises `providerRegistries`, budget-bucket eviction, or provider-config precedence — **[P2]**.

### apps/smart-suggest/scripts/*.mjs (sampled; ~13 of ~34 files unread — see coverage note below)

- `smart-suggest-forbidden-pattern-gate.mjs:315` — **[P2] Correctness (false positive)** — the `static-suggestion-array-in-app` rule regex flags any `suggestions = []` assignment, including legitimate accumulator initializations before population from an API response. Narrow to require a non-empty literal or restrict to `useState`/module-const declarations.

- `check-ultramodern-api-boundaries.mjs:516,543,556` — **[P3] Correctness** — unguarded `JSON.parse(readText(...))` on `package.json`; a malformed file crashes the whole gate with a raw stack trace instead of the intended structured `fail(...)` report. Wrap in try/catch.

- `check-ultramodern-api-boundaries.mjs:388` vs `smart-suggest-forbidden-pattern-gate.mjs` — **[P3] Inconsistency** — the two gates use different test-file exclusion regexes (`.test.[cm]?[jt]sx?$` misses `.spec.ts`, unlike the sibling gate's broader pattern). Unify.

- `smart-suggest-d1-status-proof.mjs:189` + `smart-suggest-production-seed.mjs` — **[P3] Duplication** — both reimplement wrangler D1 CLI arg-building instead of importing `wranglerExecuteArgs` from `smart-suggest-d1-operations.mjs:834`. Extract to a shared `scripts/lib/wrangler-d1.mjs`.

- `smart-suggest-owned-import.mjs` (3993 lines, whole file) — **[P2] Complexity** — one file mixing CLI parsing, per-source fetch/parse, artifact assembly, no internal module seams. Concrete split available (cli/sources/artifacts).

- All `scripts/*.mjs` — **[P2] Test gap** — zero test files reference any script under `scripts/`; these are the CI/deploy gates that decide whether Smart Suggest ships, and a bug in gate logic (like the two above) can silently pass. No shell-injection risk found (all subprocess calls use `spawnSync`/array args, no `shell: true`; no `eval`/hardcoded secrets found repo-wide).

- **Coverage gap, stated plainly**: 13 of the largest script files (incl. `validate-ultramodern-workspace.mjs` 1989 lines, `smart-suggest-public-demo-proof.mjs`, `ultramodern-cloudflare-proof.mjs`, `smart-suggest-free-tier-readiness-proof.mjs`, the whole `benchmark/` subfolder including a 2532-line file) were not read at all — findings above should not be read as full coverage of the scripts directory.

### Sampled clean

`libs/smart-suggest/validation/src/phone-strict.ts` and siblings — no `any`/unsound-cast leaks found, well-typed. `libs/smart-suggest/react/src/react.ts`'s `createMockSmartSuggestClient` hardcoding `isValid: false` is intentional mock behavior, not flagged.

---

**IMPROVEMENTS EXIST: 4 P1, 12 P2, 9 P3**

**Top 5 (ranked):**
1. `combobox.tsx:387-388` — unsound `value as string[]` cast corrupts single-select state when a caller passes a plain string (the type explicitly allows it).
2. `storage.ts:4246-4266` — insert + search-index refresh not transactional; failure mid-sequence leaves rows indexed inconsistently.
3. `storage.ts:4509` — tombstone sequence fails open (record stays searchable) if cleanup steps fail after the visibility flag flips.
4. `react.ts:192` — `AbortSignal`/`timeoutMs` declared in the options type but never wired to the actual request call; cancellation is UI-only, network calls run to completion regardless.
5. `api/index.ts:147,3214-3243` — unbounded `providerRegistries` map, the one cache in this file without the eviction pattern used everywhere else.
