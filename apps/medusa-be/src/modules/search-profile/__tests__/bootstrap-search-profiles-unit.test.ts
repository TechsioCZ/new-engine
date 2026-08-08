import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import { createMissingBootstrapProfiles } from "../loaders/bootstrap-search-profiles"
import type {
  BootstrapLogger,
  BootstrapSearchProfile,
  InternalSearchProfileService,
} from "../loaders/bootstrap-search-profiles"

const profile = (key: string): BootstrapSearchProfile => ({
  availability: "all",
  domain: key,
  key,
  limits: {
    autocomplete: { brand: 3, category: 3, content: 3, product: 6 },
    fullSearch: 500,
    page: 100,
    popular: 12,
  },
  locale: "cs",
  minimumRankingScore: 0.55,
  salesChannelIds: ["sc_1"],
  separateVariantResults: false,
  shop: "shop",
  strict: false,
})

const logger = (): BootstrapLogger => {
  const info = vi.fn<(message: string) => void>()
  const warn = vi.fn<(message: string) => void>()

  return { info, warn }
}

describe("search profile bootstrap reconciliation", () => {
  it("creates missing profiles even when another profile already exists", async () => {
    const create = vi
      .fn<InternalSearchProfileService["create"]>()
      .mockResolvedValue({})
    const listAndCount = vi
      .fn<InternalSearchProfileService["listAndCount"]>()
      .mockResolvedValue([[], 0])
    const existingKeys = new Set(["existing"])

    await expect(
      createMissingBootstrapProfiles({
        existingKeys,
        logger: logger(),
        profiles: [profile("existing"), profile("missing")],
        service: { create, listAndCount },
      }),
    ).resolves.toBe(1)
    expect(create).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ key: "missing" }),
    )
  })

  it("accepts only a typed duplicate when the profile now exists", async () => {
    const duplicate = new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      "concurrent insert",
    )
    const create = vi
      .fn<InternalSearchProfileService["create"]>()
      .mockRejectedValue(duplicate)
    const listAndCount = vi
      .fn<InternalSearchProfileService["listAndCount"]>()
      .mockResolvedValue([[{ key: "concurrent" }], 1])
    const log = logger()

    await expect(
      createMissingBootstrapProfiles({
        existingKeys: new Set(),
        logger: log,
        profiles: [profile("concurrent")],
        service: { create, listAndCount },
      }),
    ).resolves.toBe(0)
    expect(log.warn).toHaveBeenCalledOnce()
  })

  it("does not hide a duplicate caused by a different profile constraint", async () => {
    const duplicate = new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      "scope collision",
    )
    const create = vi
      .fn<InternalSearchProfileService["create"]>()
      .mockRejectedValue(duplicate)
    const listAndCount = vi
      .fn<InternalSearchProfileService["listAndCount"]>()
      .mockResolvedValue([[], 0])

    await expect(
      createMissingBootstrapProfiles({
        existingKeys: new Set(),
        logger: logger(),
        profiles: [profile("missing")],
        service: { create, listAndCount },
      }),
    ).rejects.toBe(duplicate)
  })
})
