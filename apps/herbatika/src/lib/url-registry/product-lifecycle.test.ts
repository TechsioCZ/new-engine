import { describe, expect, it } from "vitest"
import type {
  EntityRouteSnapshot,
  SourceReadResult,
  UrlRouteStatus,
} from "./contracts"
import {
  decideProductLifecycle,
  fingerprintProductLifecycleDelivery,
  type ProductLifecycleDecision,
  productLifecycleSourceEventId,
} from "./product-lifecycle"
import {
  ProductLifecycleDeliveryValidationError,
  parseProductLifecycleDeliveryV1,
} from "./product-lifecycle-parser"

const SHA_A = `sha256:${"a".repeat(64)}`
const SHA_B = `sha256:${"b".repeat(64)}`

const delivery = () => ({
  schemaVersion: 1,
  outboxEventId: "urlroe_01",
  eventId: "evt_product_01",
  envelopeFingerprint: SHA_A,
  source: "medusa",
  entityKind: "product",
  entityId: "prod_01",
  marketCode: "sk",
  streamSequence: 7,
  changeType: "reconcile",
  occurredAt: "2026-08-18T09:10:11.123Z",
  payload: {
    schemaVersion: 1,
    productId: "prod_01",
    reason: "updated",
    changeType: "reconcile",
    trace: {
      stepIdempotencyKey: "step_01",
      transactionId: "txn_01",
      workflowId: "wf_01",
    },
  },
})

const foundSource: SourceReadResult<unknown> = {
  kind: "found",
  value: { id: "prod_01" },
}
const missingSource: SourceReadResult<unknown> = { kind: "missing" }

const foundRoute = (status: UrlRouteStatus) =>
  ({
    kind: "found",
    value: { route: { status } } as EntityRouteSnapshot,
  }) as const

const routeCases = {
  active: foundRoute("active"),
  missing: { kind: "missing" } as const,
  retired: foundRoute("retired"),
  superseded: foundRoute("superseded"),
}

describe("parseProductLifecycleDeliveryV1", () => {
  it("accepts the exact V1 delivery and binds sourceEventId to the outbox row", () => {
    const parsed = parseProductLifecycleDeliveryV1(delivery())

    expect(parsed).toEqual(delivery())
    expect(productLifecycleSourceEventId(parsed)).toBe("urlroe_01")
    expect(productLifecycleSourceEventId(parsed)).not.toBe(parsed.eventId)
  })

  it.each([
    ["created", "reconcile"],
    ["updated", "reconcile"],
    ["channel-linked", "reconcile"],
    ["channel-unlinked", "reconcile"],
    ["deleted", "delete"],
  ] as const)("accepts %s only as a %s change", (reason, changeType) => {
    const input = delivery()
    input.changeType = changeType
    input.payload.changeType = changeType
    input.payload.reason = reason

    expect(parseProductLifecycleDeliveryV1(input).changeType).toBe(changeType)
  })

  it.each([
    ["non-object input", null],
    ["unknown delivery field", { ...delivery(), unexpected: true }],
    [
      "unknown payload field",
      { ...delivery(), payload: { ...delivery().payload, unexpected: true } },
    ],
    [
      "unknown trace field",
      {
        ...delivery(),
        payload: {
          ...delivery().payload,
          trace: { ...delivery().payload.trace, unexpected: true },
        },
      },
    ],
  ])("rejects %s", (_label, input) => {
    expect(() => parseProductLifecycleDeliveryV1(input)).toThrow(
      ProductLifecycleDeliveryValidationError
    )
  })

  it.each([
    ["empty ID", { ...delivery(), outboxEventId: "" }],
    ["whitespace in an ID", { ...delivery(), eventId: "evt product" }],
    ["control character in an ID", { ...delivery(), entityId: "prod\n01" }],
    ["non-ASCII ID", { ...delivery(), outboxEventId: "udalos\u0165" }],
    ["overlong ID", { ...delivery(), eventId: "x".repeat(256) }],
    [
      "invalid trace ID",
      {
        ...delivery(),
        payload: {
          ...delivery().payload,
          trace: { ...delivery().payload.trace, transactionId: "" },
        },
      },
    ],
  ])("rejects %s", (_label, input) => {
    expect(() => parseProductLifecycleDeliveryV1(input)).toThrow(
      ProductLifecycleDeliveryValidationError
    )
  })

  it("rejects an explicitly present empty trace", () => {
    const input = {
      ...delivery(),
      payload: { ...delivery().payload, trace: {} },
    }

    expect(() => parseProductLifecycleDeliveryV1(input)).toThrow(
      ProductLifecycleDeliveryValidationError
    )
  })

  it.each([
    [
      "uppercase fingerprint",
      { ...delivery(), envelopeFingerprint: SHA_A.toUpperCase() },
    ],
    ["short fingerprint", { ...delivery(), envelopeFingerprint: "sha256:abc" }],
    ["unknown market", { ...delivery(), marketCode: "de" }],
    ["zero sequence", { ...delivery(), streamSequence: 0 }],
    ["fractional sequence", { ...delivery(), streamSequence: 1.5 }],
    [
      "unsafe sequence",
      { ...delivery(), streamSequence: Number.MAX_SAFE_INTEGER + 1 },
    ],
    ["invalid timestamp", { ...delivery(), occurredAt: "not-a-date" }],
    [
      "non-canonical timestamp",
      { ...delivery(), occurredAt: "2026-08-18T11:10:11.123+02:00" },
    ],
  ])("rejects %s", (_label, input) => {
    expect(() => parseProductLifecycleDeliveryV1(input)).toThrow(
      ProductLifecycleDeliveryValidationError
    )
  })

  it.each([
    ["entity ID", { ...delivery(), entityId: "prod_other" }],
    [
      "change type",
      {
        ...delivery(),
        changeType: "delete",
        payload: { ...delivery().payload, reason: "deleted" },
      },
    ],
    [
      "reason",
      {
        ...delivery(),
        payload: { ...delivery().payload, reason: "deleted" },
      },
    ],
  ])("rejects cross-field mismatch in %s", (_label, input) => {
    expect(() => parseProductLifecycleDeliveryV1(input)).toThrow(
      ProductLifecycleDeliveryValidationError
    )
  })

  it.each([
    ["schemaVersion", { ...delivery(), schemaVersion: 2 }],
    ["source", { ...delivery(), source: "other" }],
    ["entityKind", { ...delivery(), entityKind: "category" }],
    [
      "payload.schemaVersion",
      { ...delivery(), payload: { ...delivery().payload, schemaVersion: 2 } },
    ],
  ])("rejects an invalid fixed field %s", (_label, input) => {
    expect(() => parseProductLifecycleDeliveryV1(input)).toThrow(
      ProductLifecycleDeliveryValidationError
    )
  })
})

describe("fingerprintProductLifecycleDelivery", () => {
  it("uses a stable canonical SHA-256 over the full normalized delivery", () => {
    const parsed = parseProductLifecycleDeliveryV1(delivery())

    expect(fingerprintProductLifecycleDelivery(parsed)).toBe(
      "sha256:bb8bbe3ef2e38c2224f2397a469a7bbf2c7f1bd80e915e88315c43d58cf4a9e1"
    )
  })

  it("is property-order independent and includes the upstream fingerprint", () => {
    const input = delivery()
    const reordered = {
      payload: {
        trace: input.payload.trace,
        reason: input.payload.reason,
        productId: input.payload.productId,
        schemaVersion: input.payload.schemaVersion,
        changeType: input.payload.changeType,
      },
      occurredAt: input.occurredAt,
      changeType: input.changeType,
      streamSequence: input.streamSequence,
      marketCode: input.marketCode,
      entityId: input.entityId,
      entityKind: input.entityKind,
      source: input.source,
      envelopeFingerprint: input.envelopeFingerprint,
      eventId: input.eventId,
      outboxEventId: input.outboxEventId,
      schemaVersion: input.schemaVersion,
    }
    const changedUpstreamFingerprint = {
      ...delivery(),
      envelopeFingerprint: SHA_B,
    }

    expect(
      fingerprintProductLifecycleDelivery(
        parseProductLifecycleDeliveryV1(reordered)
      )
    ).toBe(
      fingerprintProductLifecycleDelivery(
        parseProductLifecycleDeliveryV1(delivery())
      )
    )
    expect(
      fingerprintProductLifecycleDelivery(
        parseProductLifecycleDeliveryV1(changedUpstreamFingerprint)
      )
    ).not.toBe(
      fingerprintProductLifecycleDelivery(
        parseProductLifecycleDeliveryV1(delivery())
      )
    )
  })
})

describe("decideProductLifecycle", () => {
  type DecisionCase = readonly [
    string,
    "delete" | "reconcile",
    SourceReadResult<unknown>,
    SourceReadResult<EntityRouteSnapshot>,
    ProductLifecycleDecision,
  ]

  const cases: readonly DecisionCase[] = [
    [
      "retries an unavailable source",
      "reconcile",
      { kind: "unavailable" },
      routeCases.active,
      { kind: "retry", action: null, cause: "source-unavailable" },
    ],
    [
      "retries an invalid source response",
      "delete",
      { kind: "invalid-response", causeCode: "BAD_SOURCE" },
      routeCases.missing,
      { kind: "retry", action: null, cause: "source-invalid-response" },
    ],
    [
      "retries an unavailable route read",
      "reconcile",
      foundSource,
      { kind: "unavailable" },
      { kind: "retry", action: null, cause: "route-unavailable" },
    ],
    [
      "retries an invalid route response",
      "delete",
      missingSource,
      { kind: "invalid-response", causeCode: "BAD_ROUTE" },
      { kind: "retry", action: null, cause: "route-invalid-response" },
    ],
    ...(["missing", "active", "retired", "superseded"] as const).map(
      (routeKind) =>
        [
          `records missing source during reconcile with ${routeKind} route`,
          "reconcile",
          missingSource,
          routeCases[routeKind],
          { kind: "apply", action: "noop-source-missing" },
        ] as const
    ),
    [
      "requires explicit publication for a live source without a route",
      "reconcile",
      foundSource,
      routeCases.missing,
      { kind: "apply", action: "requires-publication" },
    ],
    [
      "keeps an active route for a live source",
      "reconcile",
      foundSource,
      routeCases.active,
      { kind: "apply", action: "noop-source-present" },
    ],
    ...(["retired", "superseded"] as const).map(
      (routeKind) =>
        [
          `rejects resurrection of a ${routeKind} route`,
          "reconcile",
          foundSource,
          routeCases[routeKind],
          {
            kind: "conflict",
            action: null,
            cause: "live-source-has-terminal-route",
          },
        ] as const
    ),
    ...(["missing", "active", "retired", "superseded"] as const).map(
      (routeKind) =>
        [
          `preserves a live source on delete with ${routeKind} route`,
          "delete",
          foundSource,
          routeCases[routeKind],
          { kind: "apply", action: "noop-source-present" },
        ] as const
    ),
    [
      "records a missing route after permanent source deletion",
      "delete",
      missingSource,
      routeCases.missing,
      { kind: "apply", action: "noop-route-missing" },
    ],
    [
      "retires the active route after permanent source deletion",
      "delete",
      missingSource,
      routeCases.active,
      { kind: "retire", action: "retired", route: routeCases.active.value },
    ],
    ...(["retired", "superseded"] as const).map(
      (routeKind) =>
        [
          `records an already terminal ${routeKind} route`,
          "delete",
          missingSource,
          routeCases[routeKind],
          { kind: "apply", action: "noop-route-terminal" },
        ] as const
    ),
  ]

  it.each(cases)("%s", (...testCase) => {
    const [, changeType, source, route, expected] = testCase
    expect(decideProductLifecycle(changeType, source, route)).toEqual(expected)
  })
})
