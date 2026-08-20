import { readFileSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"

const readReviewInvitation = vi.hoisted(() => vi.fn())

vi.mock("@/lib/routing/private-flows/transactional-page.server", () => ({
  transactionalFlowReader: { readReviewInvitation },
}))

import { loadReviewInvitationSource } from "./review-invitation-source.server"

describe("review invitation page market isolation", () => {
  beforeEach(() => {
    readReviewInvitation.mockReset()
  })

  it("hides the review form on RO without reading an invitation", async () => {
    await expect(
      loadReviewInvitationSource({ market: "ro", token: "review-token" })
    ).resolves.toEqual({ kind: "missing" })
    expect(readReviewInvitation).not.toHaveBeenCalled()
  })

  it("preserves an exact SK invitation", async () => {
    readReviewInvitation.mockResolvedValue({
      kind: "found",
      value: { productId: "prod_1" },
    })

    await expect(
      loadReviewInvitationSource({
        market: "sk",
        productId: "prod_1",
        token: "review-token",
      })
    ).resolves.toEqual({
      kind: "found",
      value: { productId: "prod_1", token: "review-token" },
    })
    expect(readReviewInvitation).toHaveBeenCalledWith("sk", "review-token")
  })

  it("keeps the server reader outside the Pages client module graph", () => {
    const pageSource = readFileSync(
      new URL(
        "../../../pages/~sf/[market]/reviews/product/[token].tsx",
        import.meta.url
      ),
      "utf8"
    )

    expect(pageSource).not.toContain("transactional-page.server")
    expect(pageSource).not.toContain("export const loadReviewInvitationSource")
    expect(pageSource).toContain(
      'import { loadReviewInvitationSource } from "@/lib/routing/private-flows/review-invitation-source.server"'
    )
  })
})
