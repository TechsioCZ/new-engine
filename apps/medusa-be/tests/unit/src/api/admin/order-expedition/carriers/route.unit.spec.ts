import { afterEach, describe, expect, it, vi } from "vitest"

const createMockResponse = () => ({
  json: vi.fn().mockReturnThis(),
})

describe("GET /admin/order-expedition/carriers", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns only the generic carrier when integrations are disabled", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/carriers/route"
    )
    const res = createMockResponse()

    vi.stubEnv("FEATURE_GLS_ENABLED", "0")
    vi.stubEnv("FEATURE_PACKETA_ENABLED", "0")
    vi.stubEnv("FEATURE_PPL_ENABLED", "0")

    await GET({ scope: { resolve: vi.fn() } } as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      carriers: [{ label: "Other", value: "other" }],
    })
  })

  it("returns only integrations enabled in their active configuration", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/carriers/route"
    )
    const res = createMockResponse()
    const services = {
      gls_client: {
        getActiveConfig: vi.fn().mockResolvedValue({ is_enabled: true }),
      },
      packeta_client: {
        getActiveConfig: vi.fn().mockResolvedValue({ is_enabled: true }),
      },
      ppl_client: {
        getConfig: vi.fn().mockResolvedValue({ is_enabled: false }),
      },
    }

    vi.stubEnv("FEATURE_GLS_ENABLED", "1")
    vi.stubEnv("FEATURE_PACKETA_ENABLED", "1")
    vi.stubEnv("FEATURE_PPL_ENABLED", "1")

    await GET(
      {
        scope: {
          resolve: vi.fn((key: keyof typeof services) => services[key]),
        },
      } as never,
      res as never
    )

    expect(res.json).toHaveBeenCalledWith({
      carriers: [
        { label: "GLS", value: "gls" },
        { label: "Packeta", value: "packeta" },
        { label: "Other", value: "other" },
      ],
    })
  })
})
