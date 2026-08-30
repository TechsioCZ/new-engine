Reviewed the priority surfaces (`react.ts`, `combobox.tsx`, phone/postal fields, `vanilla.ts` attach/destroy, `api/index.ts` shard+error layers, `storage.ts` hotspots, client abort wiring). This is a genuinely high-quality PR — sequence guards, abort propagation, and controlled/uncontrolled handling are all correct. No P1 correctness hazards survived verification (I chased an abort-signal leak in `react.ts` and disproved it: `client.ts:203-204` merges Effect's fiber-interruption signal, so `runCallback`'s `interrupt()` does abort the network request even though `requestOptions` is `{}`).

Findings, verified against source:

**P2**

- `libs/smart-suggest/react/src/react.ts:292` + `libs/smart-suggest/ui/src/phone-validation-field.tsx:69` — [P2] duplication-that-drifts — Two functions both named `createLitePhoneValidationResult` with *divergent semantics*: react's returns a result for every lite status with `isPossible: liteResult.canAttemptStrictValidation`; the field's returns `undefined` for `strict_validation_required` and hardcodes `isPossible: false`. Same name, different contract → refactor hazard, exactly the drift the api.ts AST gate exists to prevent. Move one canonical `liteResultToPhoneValidationResult` into `@techsio/smart-suggest-validation` and have both call it (parameterize the strict-required→undefined choice).

**P3**

- `libs/smart-suggest/ui/src/phone-validation-field.tsx:97` + `postal-validation-field.tsx:56` — [P3] duplication — `getStatusText(helpText, result, statusText)` is byte-identical across both fields; `getValidationStatus` is near-identical (postal only adds the `'unknown'→'warning'` case). Extract `getStatusText` to a shared `field-status.ts` in the ui package.

- `libs/smart-suggest/storage/src/storage.ts:1790` — [P3] type-safety — `toArtifactCountryCode = (value: string) => value as SmartSuggestCountryCode` launders an arbitrary string into a branded type with no validation, a lying cast at the ingestion boundary. Validate against the country-code schema (or `SmartSuggestCountryCode` guard) and reject/skip on miss instead of asserting.

- `apps/smart-suggest/apps/shell-super-app/api/index.ts:586-823` — [P3] complexity/god-file — 4357-line file has a clean, dependency-light seam: the shard-routing block (`hashStringToPositiveInteger` → `rankShardAddressRecordResults`, 586–823) depends only on registry types and `rankAddressCandidates`. Extract to `api/shard-routing.ts`. Second clean seam: the error constructors + `Schema.is` guards (1140–1234) → `api/errors.ts`. Both are pure and independently testable; ~500 lines out of the god file with zero behavioral risk.

- `libs/smart-suggest/ui/src/phone-validation-field.tsx:237` vs `postal-validation-field.tsx:153` — [P3] API-design inconsistency — Phone only fires `onValidationChange` when `nextResult !== undefined`; postal fires it unconditionally (and again from the `onChange` fallback path, `postal:181`). A consumer wiring both fields gets inconsistent "cleared validation" notifications. Pick one contract (recommend: always emit, with an explicit `undefined`/cleared result) and document it.

- `libs/smart-suggest/storage/src/storage.ts:1753-1788` — [P3] complexity/fragility — `extractJsonObjectArrayPrefix` is a hand-rolled partial-JSON scanner over serialized artifact blobs (perf optimization to read a bounded prefix). It's correct given `extractJsonObjectAt` handles escaping, but it's brittle to any serialization format change and the `as unknown` at 1783 is unguarded. Add a comment stating the invariant it relies on (D1 `json_group_array` output shape) and ensure downstream schema-validates each pushed value.

- `libs/smart-suggest/ui/src/postal-validation-field.tsx:93-102,180-187` — [P3] duplicate-work — With no provided validator, the fallback is computed by the `useMemo` (93) *and* recomputed in `onChange` (182) on every keystroke to fire `onValidationChange`. Same input, same result, twice per key. Derive the emitted result from the memo (lift the notify into an effect keyed on `validationResult`) rather than recomputing.

**Test gap (P3)**

- `libs/smart-suggest/react` — [P3] test-coverage — `useAbortableRequest` (react.ts:180-196) has subtle behavior: loading is announced only *after* the debounce window (`sleep(delayMs).pipe(flatMap(announceLoading))`), and previous `data` is preserved across loading/error transitions. If broken (announce-before-debounce, or dropping prior data), UX regresses silently. Confirm a test asserts "no `loading` state before `debounceMs` elapses" and "prior `data` retained on error"; add if absent.

IMPROVEMENTS EXIST: 0 P1, 1 P2, 7 P3

Top-5 ranked:
1. `react.ts:292` / `phone-validation-field.tsx:69` — duplicate `createLitePhoneValidationResult` with divergent semantics (P2).
2. `api/index.ts:586-823` + `1140-1234` — extract shard-routing and errors modules from the god file (P3).
3. `storage.ts:1790` — unsound `as SmartSuggestCountryCode` at ingestion boundary (P3).
4. phone/postal fields — extract shared `getStatusText`/`getValidationStatus` (P3).
5. phone vs postal `onValidationChange` contract inconsistency (P3).
