import { describe, expect, it } from "vitest"
import { diffIds } from "../../../../src/workflows/producer"

describe("producer workflows", () => {
  describe("diffIds", () => {
    it("returns only links that need to be added and removed", () => {
      expect(diffIds(["prod_1", "prod_2"], ["prod_2", "prod_3"])).toEqual({
        add: ["prod_3"],
        remove: ["prod_1"],
      })
    })

    it("deduplicates incoming selections before diffing", () => {
      expect(
        diffIds(["prod_1"], ["prod_1", "prod_1", "prod_2", "prod_2"])
      ).toEqual({
        add: ["prod_2"],
        remove: [],
      })
    })

    it("returns empty changes for no-op replacements", () => {
      expect(diffIds(["prod_1", "prod_2"], ["prod_2", "prod_1"])).toEqual({
        add: [],
        remove: [],
      })
    })
  })
})
