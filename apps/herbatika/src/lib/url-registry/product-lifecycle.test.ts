import { describe, expect, it } from "vitest"
import type {
  EntityRouteSnapshot,
  SourceReadResult,
  UrlRouteStatus,
} from "./contracts"
import {
  decideCatalogLifecycle,
  decideProductLifecycle,
  decideTranslationInvalidatedProductLifecycle,
  fingerprintProductLifecycleDelivery,
  type ProductLifecycleDecision,
  productLifecycleSourceEventId,
} from "./product-lifecycle"
import {
  ProductLifecycleDeliveryValidationError,
  type ProductPublicationAssignmentV1,
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
    assignment: {
      publicationStatus: "published",
      publicSlug: "product-01",
      salesChannelId: "sc_sk",
    },
    schemaVersion: 1,
    productId: "prod_01",
    reason: "updated",
    changeType: "reconcile",
    sourceVersion: "2026-08-18T09:00:00.000Z",
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
    value: {
      currentSlug: { normalizedSlug: "product-01" },
      route: { status },
    } as EntityRouteSnapshot,
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

  it("preserves exact long customer slugs with leading, repeated, and trailing hyphens", () => {
    const input = delivery()
    const publicSlug = `-${"long-customer-slug-".repeat(8)}end--`
    input.payload.assignment.publicSlug = publicSlug

    expect(
      parseProductLifecycleDeliveryV1(input).payload.assignment?.publicSlug
    ).toBe(publicSlug)
  })

  it.each([
    ["created", "reconcile"],
    ["updated", "reconcile"],
    ["channel-linked", "reconcile"],
    ["channel-unlinked", "reconcile"],
    ["translation-invalidated", "reconcile"],
    ["deleted", "delete"],
  ] as const)("accepts %s only as a %s change", (reason, changeType) => {
    const input = delivery()
    const candidate = {
      ...input,
      changeType,
      payload: {
        ...input.payload,
        assignment: reason === "deleted" ? null : input.payload.assignment,
        changeType,
        reason,
      },
    }

    expect(parseProductLifecycleDeliveryV1(candidate).changeType).toBe(
      changeType
    )
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
      "sha256:c7875a015fec76a1005eaa75795cc1e8d29ab38b2a1b1de57f6a065fbcb1d91d"
    )
  })

  it("is property-order independent and includes the upstream fingerprint", () => {
    const input = delivery()
    const reordered = {
      payload: {
        assignment: input.payload.assignment,
        trace: input.payload.trace,
        reason: input.payload.reason,
        productId: input.payload.productId,
        schemaVersion: input.payload.schemaVersion,
        changeType: input.payload.changeType,
        sourceVersion: input.payload.sourceVersion,
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
  const publishedAssignment = {
    publicationStatus: "published",
    publicSlug: "product-01",
    salesChannelId: "sc_sk",
  } as const

  type DecisionCase = readonly [
    string,
    "delete" | "reconcile",
    ProductPublicationAssignmentV1 | null,
    SourceReadResult<unknown>,
    SourceReadResult<EntityRouteSnapshot>,
    ProductLifecycleDecision,
  ]

  const cases: readonly DecisionCase[] = [
    [
      "retries an unavailable source",
      "reconcile",
      publishedAssignment,
      { kind: "unavailable" },
      routeCases.active,
      { kind: "retry", action: null, cause: "source-unavailable" },
    ],
    [
      "retries an invalid source response",
      "delete",
      null,
      { kind: "invalid-response", causeCode: "BAD_SOURCE" },
      routeCases.missing,
      { kind: "retry", action: null, cause: "source-invalid-response" },
    ],
    [
      "retries an unavailable route read",
      "reconcile",
      publishedAssignment,
      foundSource,
      { kind: "unavailable" },
      { kind: "retry", action: null, cause: "route-unavailable" },
    ],
    [
      "retries an invalid route response",
      "delete",
      null,
      missingSource,
      { kind: "invalid-response", causeCode: "BAD_ROUTE" },
      { kind: "retry", action: null, cause: "route-invalid-response" },
    ],
    [
      "publishes an explicitly assigned live source without a route",
      "reconcile",
      publishedAssignment,
      foundSource,
      routeCases.missing,
      { kind: "publish", action: "published", publicSlug: "product-01" },
    ],
    [
      "keeps an active route for a live source",
      "reconcile",
      publishedAssignment,
      foundSource,
      routeCases.active,
      { kind: "apply", action: "noop-source-present" },
    ],
    [
      "changes the slug of an active published route",
      "reconcile",
      { ...publishedAssignment, publicSlug: "new-product-01" },
      foundSource,
      routeCases.active,
      {
        kind: "change-slug",
        action: "slug-changed",
        publicSlug: "new-product-01",
        route: routeCases.active.value,
      },
    ],
    [
      "unpublishes an active route when the assignment is removed",
      "reconcile",
      null,
      foundSource,
      routeCases.active,
      { kind: "apply", action: "unpublished" },
    ],
    [
      "records an unpublished product without creating a route",
      "reconcile",
      null,
      missingSource,
      routeCases.missing,
      { kind: "apply", action: "noop-unpublished" },
    ],
    ...(["retired", "superseded"] as const).map(
      (routeKind) =>
        [
          `rejects resurrection of a ${routeKind} route`,
          "reconcile",
          publishedAssignment,
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
          null,
          foundSource,
          routeCases[routeKind],
          { kind: "apply", action: "noop-source-present" },
        ] as const
    ),
    [
      "records a missing route after permanent source deletion",
      "delete",
      null,
      missingSource,
      routeCases.missing,
      { kind: "apply", action: "noop-route-missing" },
    ],
    [
      "retires the active route after permanent source deletion",
      "delete",
      null,
      missingSource,
      routeCases.active,
      { kind: "retire", action: "retired", route: routeCases.active.value },
    ],
    ...(["retired", "superseded"] as const).map(
      (routeKind) =>
        [
          `records an already terminal ${routeKind} route`,
          "delete",
          null,
          missingSource,
          routeCases[routeKind],
          { kind: "apply", action: "noop-route-terminal" },
        ] as const
    ),
  ]

  it.each(cases)("%s", (...testCase) => {
    const [, changeType, assignment, source, route, expected] = testCase
    expect(
      decideProductLifecycle(changeType, assignment, source, route)
    ).toEqual(expected)
  })

  const routeAfter = (
    route: SourceReadResult<EntityRouteSnapshot>,
    decision: ProductLifecycleDecision
  ): SourceReadResult<EntityRouteSnapshot> => {
    if (decision.kind === "publish") {
      return routeCases.active
    }
    return decision.kind === "retire" ? routeCases.retired : route
  }

  const replayReconcile = (
    steps: readonly (readonly [
      ProductPublicationAssignmentV1 | null,
      SourceReadResult<unknown>,
    ])[],
    decide: typeof decideProductLifecycle = decideProductLifecycle
  ): ProductLifecycleDecision[] => {
    let route: SourceReadResult<EntityRouteSnapshot> = routeCases.missing
    const decisions: ProductLifecycleDecision[] = []
    for (const [assignment, source] of steps) {
      const decision = decide("reconcile", assignment, source, route)
      decisions.push(decision)
      route = routeAfter(route, decision)
    }
    return decisions
  }

  it("republishes a product after it was unpublished", () => {
    const decisions = replayReconcile([
      [publishedAssignment, foundSource],
      [null, missingSource],
      [publishedAssignment, foundSource],
    ])

    expect(decisions).toEqual([
      { kind: "publish", action: "published", publicSlug: "product-01" },
      { kind: "apply", action: "unpublished" },
      { kind: "apply", action: "noop-source-present" },
    ])
    expect(decisions.at(-1)).not.toMatchObject({ kind: "conflict" })
  })

  it("changes the slug when a republished product carries a new slug", () => {
    const decisions = replayReconcile([
      [publishedAssignment, foundSource],
      [null, missingSource],
      [{ ...publishedAssignment, publicSlug: "product-02" }, foundSource],
    ])

    expect(decisions.at(-1)).toEqual({
      kind: "change-slug",
      action: "slug-changed",
      publicSlug: "product-02",
      route: routeCases.active.value,
    })
  })

  it("does not retire an active route for a translation invalidation", () => {
    expect(
      decideTranslationInvalidatedProductLifecycle(
        "reconcile",
        null,
        missingSource,
        routeCases.active
      )
    ).toEqual({ action: "unpublished", kind: "apply" })
  })

  it("does not retire a catalog route for a stale queued published slug", () => {
    expect(
      decideCatalogLifecycle(
        "reconcile",
        publishedAssignment,
        missingSource,
        routeCases.active
      )
    ).toEqual({ action: "noop-source-missing", kind: "apply" })
  })

  it("republishes a product after a translation invalidation unpublished it", () => {
    const decisions = replayReconcile(
      [
        [publishedAssignment, foundSource],
        [null, missingSource],
        [publishedAssignment, foundSource],
      ],
      decideTranslationInvalidatedProductLifecycle
    )

    expect(decisions).toEqual([
      { kind: "publish", action: "published", publicSlug: "product-01" },
      { kind: "apply", action: "unpublished" },
      { kind: "apply", action: "noop-source-present" },
    ])
    expect(decisions.at(-1)).not.toMatchObject({ kind: "conflict" })
  })

  it("changes the slug when a product republished after translation invalidation carries a new slug", () => {
    const decisions = replayReconcile(
      [
        [publishedAssignment, foundSource],
        [null, missingSource],
        [{ ...publishedAssignment, publicSlug: "product-02" }, foundSource],
      ],
      decideTranslationInvalidatedProductLifecycle
    )

    expect(decisions.at(-1)).toEqual({
      kind: "change-slug",
      action: "slug-changed",
      publicSlug: "product-02",
      route: routeCases.active.value,
    })
  })

  it("republishes a catalog entity after it was unpublished", () => {
    const decisions = replayReconcile(
      [
        [publishedAssignment, foundSource],
        [null, missingSource],
        [publishedAssignment, foundSource],
      ],
      decideCatalogLifecycle
    )

    expect(decisions).toEqual([
      { kind: "publish", action: "published", publicSlug: "product-01" },
      { kind: "apply", action: "unpublished" },
      { kind: "apply", action: "noop-source-present" },
    ])
    expect(decisions.at(-1)).not.toMatchObject({ kind: "conflict" })
  })

  it("changes the slug when a catalog entity republished after unpublish carries a new slug", () => {
    const decisions = replayReconcile(
      [
        [publishedAssignment, foundSource],
        [null, missingSource],
        [{ ...publishedAssignment, publicSlug: "product-02" }, foundSource],
      ],
      decideCatalogLifecycle
    )

    expect(decisions.at(-1)).toEqual({
      kind: "change-slug",
      action: "slug-changed",
      publicSlug: "product-02",
      route: routeCases.active.value,
    })
  })
})
