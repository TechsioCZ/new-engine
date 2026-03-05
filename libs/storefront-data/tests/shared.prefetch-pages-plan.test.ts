import {
  createPrefetchPagesPlan,
} from "../src/shared/prefetch-pages-plan"

describe("createPrefetchPagesPlan", () => {
  it("creates priority plan with immediate, medium, and low buckets", () => {
    const plan = createPrefetchPagesPlan({
      mode: "priority",
      currentPage: 3,
      totalPages: 10,
      hasNextPage: true,
      hasPrevPage: true,
    })

    expect(plan).toEqual({
      immediate: [4],
      medium: [5],
      low: [2, 1, 10],
    })
  })

  it("creates simple plan with deduplicated pages", () => {
    const plan = createPrefetchPagesPlan({
      mode: "simple",
      currentPage: 3,
      totalPages: 10,
      hasNextPage: true,
      hasPrevPage: true,
    })

    expect(plan).toEqual({
      immediate: [1, 2, 4, 5, 10],
      medium: [],
      low: [],
    })
  })

  it("avoids out-of-range pages on edges", () => {
    const firstPagePlan = createPrefetchPagesPlan({
      mode: "priority",
      currentPage: 1,
      totalPages: 4,
      hasNextPage: true,
      hasPrevPage: false,
    })
    const lastPagePlan = createPrefetchPagesPlan({
      mode: "priority",
      currentPage: 4,
      totalPages: 4,
      hasNextPage: false,
      hasPrevPage: true,
    })

    expect(firstPagePlan).toEqual({
      immediate: [2],
      medium: [3],
      low: [4],
    })
    expect(lastPagePlan).toEqual({
      immediate: [],
      medium: [],
      low: [3, 1],
    })
  })
})
