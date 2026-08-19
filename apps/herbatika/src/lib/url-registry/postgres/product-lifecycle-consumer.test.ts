import { describe, expect, it } from "vitest"
import type { ProductLifecycleDeliveryV1 } from "../product-lifecycle-parser"
import {
  classifyProductLifecycleStream,
  type ProductLifecycleReceipt,
} from "./product-lifecycle-consumer-support"

const fingerprint = `sha256:${"b".repeat(64)}` as const

const delivery = (
  streamSequence: number,
  overrides: Partial<ProductLifecycleDeliveryV1> = {}
): ProductLifecycleDeliveryV1 => ({
  schemaVersion: 1,
  outboxEventId: `urlroe_${streamSequence}`,
  eventId: `evt_${streamSequence}`,
  envelopeFingerprint: `sha256:${"a".repeat(64)}`,
  source: "medusa",
  entityKind: "product",
  entityId: "prod_01",
  marketCode: "sk",
  streamSequence,
  changeType: "reconcile",
  occurredAt: "2026-08-18T10:00:00.000Z",
  payload: {
    schemaVersion: 1,
    productId: "prod_01",
    reason: "updated",
    changeType: "reconcile",
  },
  ...overrides,
})

const receipt = (
  streamSequence: number,
  overrides: Partial<ProductLifecycleReceipt> = {}
): ProductLifecycleReceipt => ({
  streamSequence,
  sourceEventId: `urlroe_${streamSequence}`,
  envelopeFingerprint: fingerprint,
  changeType: "reconcile",
  action: "noop-source-present",
  commandIdempotencyKey: null,
  ...overrides,
})

describe("classifyProductLifecycleStream", () => {
  it("replays only the exact persisted delivery", () => {
    expect(
      classifyProductLifecycleStream(delivery(2), fingerprint, {
        cursorLastSequence: 2,
        eventReceipt: receipt(2),
        sequenceReceipt: receipt(2),
      })
    ).toEqual({
      kind: "replay",
      action: "noop-source-present",
      commandIdempotencyKey: null,
    })
  })

  it("rejects payload drift at the current sequence", () => {
    expect(() =>
      classifyProductLifecycleStream(delivery(2), fingerprint, {
        cursorLastSequence: 2,
        eventReceipt: null,
        sequenceReceipt: receipt(2, {
          envelopeFingerprint: `sha256:${"c".repeat(64)}`,
        }),
      })
    ).toThrowError(
      expect.objectContaining({
        code: "DELIVERY_DRIFT",
      })
    )
  })

  it("rejects a non-exact delivery behind the high-water mark as stale", () => {
    expect(() =>
      classifyProductLifecycleStream(delivery(1), fingerprint, {
        cursorLastSequence: 2,
        eventReceipt: null,
        sequenceReceipt: receipt(1, { sourceEventId: "urlroe_other" }),
      })
    ).toThrowError(
      expect.objectContaining({
        code: "STALE_DELIVERY",
      })
    )
  })

  it("rejects reuse of an outbox row at another stream position", () => {
    expect(() =>
      classifyProductLifecycleStream(delivery(2), fingerprint, {
        cursorLastSequence: 1,
        eventReceipt: receipt(1, { sourceEventId: "urlroe_2" }),
        sequenceReceipt: null,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "DELIVERY_DRIFT",
      })
    )
  })

  it.each([
    [null, 2],
    [1, 3],
  ] as const)("rejects sequence %s -> %s gaps", (cursorLastSequence, streamSequence) => {
    expect(() =>
      classifyProductLifecycleStream(delivery(streamSequence), fingerprint, {
        cursorLastSequence,
        eventReceipt: null,
        sequenceReceipt: null,
      })
    ).toThrowError(
      expect.objectContaining({
        code: "SEQUENCE_GAP",
      })
    )
  })

  it.each([
    [null, 1],
    [1, 2],
  ] as const)("accepts the next contiguous stream position", (cursorLastSequence, streamSequence) => {
    expect(
      classifyProductLifecycleStream(delivery(streamSequence), fingerprint, {
        cursorLastSequence,
        eventReceipt: null,
        sequenceReceipt: null,
      })
    ).toEqual({ kind: "next" })
  })
})
