import assert from "node:assert/strict"
import test from "node:test"
import * as idUtils from "./id-utils.ts"

const idUtilsModule =
  "default" in idUtils
    ? (idUtils.default as typeof import("./id-utils.ts"))
    : (idUtils as typeof import("./id-utils.ts"))

test("dedupeIdsFromHits keeps order and removes duplicates/invalid values", () => {
  const ids = idUtilsModule.dedupeIdsFromHits([
    { id: " p_1 " },
    { id: "p_2" },
    { id: "p_1" },
    { id: "" },
    {},
  ])

  assert.deepEqual(ids, ["p_1", "p_2"])
})

test("orderProductsByIds returns products in ID order", () => {
  const products = [
    { id: "p_2", title: "B" },
    { id: "p_1", title: "A" },
    { id: "p_3", title: "C" },
  ]

  const ordered = idUtilsModule.orderProductsByIds(products, [
    "p_1",
    "p_3",
    "p_999",
  ])
  assert.deepEqual(ordered, [
    { id: "p_1", title: "A" },
    { id: "p_3", title: "C" },
  ])
})

test("intersectIdsPreservingOrder respects source order", () => {
  const intersected = idUtilsModule.intersectIdsPreservingOrder(
    ["p_3", "p_1", "p_2"],
    ["p_1", "p_3"]
  )

  assert.deepEqual(intersected, ["p_3", "p_1"])
})

test("collectIdsFromPaginatedSource collects pages and deduplicates", async () => {
  const pages = [
    { ids: ["p_1", "p_2"], itemCount: 2, totalCount: 4 },
    { ids: ["p_2", "p_3"], itemCount: 2, totalCount: 4 },
  ]

  let call = 0
  const result = await idUtilsModule.collectIdsFromPaginatedSource(async () => {
    const page = pages[call]
    call += 1
    return page ?? { ids: [], itemCount: 0 }
  })

  assert.deepEqual(result, ["p_1", "p_2", "p_3"])
  assert.equal(call, 2)
})

test("collectIdsFromPaginatedSource aborts when signal is already aborted", async () => {
  const controller = new AbortController()
  controller.abort()

  await assert.rejects(
    idUtilsModule.collectIdsFromPaginatedSource(
      async () => ({ ids: [], itemCount: 0 }),
      { signal: controller.signal }
    ),
    (error: unknown) =>
      error instanceof DOMException && error.name === "AbortError"
  )
})

test("collectIdsFromPaginatedSource enforces maxCollectedIds", async () => {
  await assert.rejects(
    idUtilsModule.collectIdsFromPaginatedSource(
      async () => ({
        ids: ["p_1", "p_2", "p_3"],
        itemCount: 3,
        totalCount: 3,
      }),
      {
        maxCollectedIds: 2,
        sourceLabel: "unit-test",
      }
    ),
    /Collected IDs exceeded 2 for unit-test/
  )
})

test("awaitAbortable rejects with AbortError when caller aborts", async () => {
  const controller = new AbortController()
  const pending = new Promise<string>((resolve) => {
    setTimeout(() => resolve("ok"), 20)
  })

  const awaited = idUtilsModule.awaitAbortable(pending, controller.signal)
  controller.abort()

  await assert.rejects(
    awaited,
    (error: unknown) =>
      error instanceof DOMException && error.name === "AbortError"
  )
})
