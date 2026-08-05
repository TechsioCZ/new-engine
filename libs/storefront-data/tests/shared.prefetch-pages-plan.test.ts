import { expect, describe, it } from "vitest"

import { createPrefetchPagesPlan } from "../src/shared/prefetch-pages-plan"

describe(createPrefetchPagesPlan, () => {
  it("creates priority plan with immediate, medium, and low buckets", () => {
    const plan = createPrefetchPagesPlan({
      currentPage: 3,
      hasNextPage: true,
      hasPrevPage: true,
      mode: "priority",
      totalPages: 10,
    })

    expect(plan).toStrictEqual({
      immediate: [4],
      low: [2, 1, 10],
      medium: [5],
    })
  })

  it("creates simple plan with deduplicated pages", () => {
    const plan = createPrefetchPagesPlan({
      currentPage: 3,
      hasNextPage: true,
      hasPrevPage: true,
      mode: "simple",
      totalPages: 10,
    })

    expect(plan).toStrictEqual({
      immediate: [1, 2, 4, 5, 10],
      low: [],
      medium: [],
    })
  })

  it("avoids out-of-range pages on edges", () => {
    const firstPagePlan = createPrefetchPagesPlan({
      currentPage: 1,
      hasNextPage: true,
      hasPrevPage: false,
      mode: "priority",
      totalPages: 4,
    })
    const lastPagePlan = createPrefetchPagesPlan({
      currentPage: 4,
      hasNextPage: false,
      hasPrevPage: true,
      mode: "priority",
      totalPages: 4,
    })

    expect(firstPagePlan).toStrictEqual({
      immediate: [2],
      low: [4],
      medium: [3],
    })
    expect(lastPagePlan).toStrictEqual({
      immediate: [],
      low: [3, 1],
      medium: [],
    })
  })

  it("keeps priority buckets mutually exclusive near the tail", () => {
    const nearTailPlan = createPrefetchPagesPlan({
      currentPage: 9,
      hasNextPage: true,
      hasPrevPage: true,
      mode: "priority",
      totalPages: 10,
    })
    const twoAwayPlan = createPrefetchPagesPlan({
      currentPage: 8,
      hasNextPage: true,
      hasPrevPage: true,
      mode: "priority",
      totalPages: 10,
    })

    expect(nearTailPlan).toStrictEqual({
      immediate: [10],
      low: [8, 1],
      medium: [],
    })
    expect(twoAwayPlan).toStrictEqual({
      immediate: [9],
      low: [7, 1],
      medium: [10],
    })
  })
})
