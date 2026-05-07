# Code Review: Feature packeta modul (PR #390)

Overall this is a well-structured integration. The layering (client → service → fulfillment provider → admin API → admin UI) is clean and the test coverage in `service.unit.spec.ts` is solid. A few issues worth addressing before merging.

---

## Bugs

### 1. `getBranchList` falls back to the shipment API password as the pickup-point widget key

**File:** `apps/medusa-be/src/modules/packeta-client/client.ts:178`

```ts
const url = BRANCH_FEED_URL.replace(
  "{apiKey}",
  encodeURIComponent(
    process.env.PACKETA_PICKUP_POINTS_API_KEY ?? this.options.api_password  // ← wrong fallback
  )
)
```

The pickup-point feed (branch.json) requires the *web widget* API key (`PACKETA_PICKUP_POINTS_API_KEY`), which is a different credential than the shipment API password. When `PACKETA_PICKUP_POINTS_API_KEY` is absent the code silently embeds the shipment credential (`api_password`) into the feed URL. This is both functionally wrong (the feed likely returns an auth error) and a security concern (the shipment credential appears in the URL and can end up in access logs, proxy headers, etc.).

The fallback should fail explicitly or log a warning instead of using the wrong key.

---

### 2. `PacketaConfigDTO.default_label_format` typed as `string` instead of `PacketaLabelFormat`

**File:** `apps/medusa-be/src/modules/packeta-client/types.ts:237`

```ts
export type PacketaConfigDTO = {
  ...
  default_label_format: string   // should be PacketaLabelFormat
  ...
}
```

`PacketaLabelFormat = "A6" | "A7"` is already defined in the same file. Using `string` weakens the type contract — code that reads `config.default_label_format` loses narrowing and could pass an unexpected value to `downloadLabelPdf`.

---

## Security

### 3. Content-Disposition filename uses unsanitised barcode

**File:** `apps/medusa-be/src/api/admin/packeta-labels/route.ts:172-176`

```ts
function buildFilename(labels: PrintablePacketaLabel[]): string {
  const first = labels[0]
  if (labels.length === 1 && first?.barcode) {
    return `packeta-label-${first.barcode}.pdf`
  }
  ...
}
// used as:
"Content-Disposition": `attachment; filename="${filename}"`
```

The barcode comes from Packeta's API response and is embedded directly into the HTTP header value inside double quotes. A barcode containing `"` or CRLF sequences could break or escape the header. Use `filename*=UTF-8''${encodeURIComponent(filename)}` (RFC 5987) or at minimum strip non-filename-safe characters from the barcode before embedding.

---

### 4. Tracking URL embeds barcode without encoding

**File:** `apps/medusa-be/src/modules/fulfillment-packeta/service.ts:274`

```ts
const trackingUrl = `https://tracking.packeta.com/${result.barcode}`
```

Barcodes are alphanumeric in practice, but `encodeURIComponent(result.barcode)` is the correct approach for any externally-supplied string inserted into a URL path segment.

---

## Robustness

### 5. Lock-timeout detection relies on fragile string matching

**File:** `apps/medusa-be/src/jobs/packeta-tracking-sync.ts:74-78`

```ts
if (error instanceof Error && error.message.includes("Timed-out")) {
  logger.debug("Packeta Tracking Sync: lock held by another instance, skipping")
  return
}
```

The locking module's error message format could change, causing the check to silently stop working — the job would then re-throw an unexpected error instead of quietly skipping. Either check a dedicated error type/code, or at minimum document why this exact string is expected and which module version was tested against. The PPL tracking sync handles this the same way, so this pattern is already established in the codebase, but it is worth noting.

---

## Validation

### 6. Email `max(50)` in config validator is too restrictive

**File:** `apps/medusa-be/src/api/admin/packeta-config/validators.ts:21`

```ts
sender_email: z.string().email().max(50).optional(),
```

RFC 5321 allows email addresses up to 320 characters (64 local + 1 `@` + 255 domain). A 50-character cap will reject many legitimate business email addresses. Consider `max(254)` (the practical limit per RFC 5321 § 4.5.3.1.3) or higher.

---

## Configuration

### 7. When both PPL and Packeta are disabled, the manual fulfillment provider is also unavailable

**File:** `apps/medusa-be/medusa-config.ts:323`

```ts
...(FEATURE_PPL_ENABLED || FEATURE_PACKETA_ENABLED
  ? [{ resolve: "@medusajs/medusa/fulfillment", ... }]
  : []),
```

The `fulfillment-manual` provider is bundled inside the fulfillment module, so it is only registered when at least one carrier flag is `true`. In environments where both flags are `0` (the default in `.env.template`), the manual shipping option is not available. This matches the previous PPL-only behaviour, so it is not a regression, but it should be called out in the PR description or a `NOTES` comment for operators who rely on manual fulfilment without any carrier module.

---

## Minor

### 8. Error details from Packeta serialized unfiltered into logs

**File:** `apps/medusa-be/src/modules/packeta-client/client.ts:295`

```ts
const detailSuffix = envelope.detail
  ? ` Detail: ${JSON.stringify(envelope.detail)}`
  : ""
```

`envelope.detail` comes from Packeta's API fault responses and may contain customer PII or internal account data. Consider logging at `debug` level or redacting the detail field in production environments.

---

## Summary

| # | File | Severity | Description |
|---|------|----------|-------------|
| 1 | `client.ts:178` | **Bug / Security** | Wrong API key used for branch feed URL when env var absent |
| 2 | `types.ts:237` | **Bug** | `default_label_format` typed as `string` instead of `PacketaLabelFormat` |
| 3 | `route.ts:172` (labels) | **Security** | Barcode unsanitised in `Content-Disposition` filename |
| 4 | `service.ts:274` (fulfillment) | **Security** | Barcode not URL-encoded in tracking URL |
| 5 | `packeta-tracking-sync.ts:74` | **Robustness** | Lock-timeout detection via fragile string matching |
| 6 | `validators.ts:21` (config) | **Validation** | Email max length of 50 rejects valid addresses |
| 7 | `medusa-config.ts:323` | **Behaviour** | Manual fulfillment unavailable when both carriers disabled |
| 8 | `client.ts:295` | **Minor** | Packeta fault detail logged unfiltered |
