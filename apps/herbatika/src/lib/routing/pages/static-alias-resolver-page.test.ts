import type { GetServerSidePropsContext } from "next"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUrlRegistryRuntime: vi.fn(),
}))

vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: mocks.getUrlRegistryRuntime,
}))

import { getServerSideProps } from "@/pages/~sf/[market]/url-registry/[...segments]"

const context = (
  segments: string[],
  overrides: Partial<GetServerSidePropsContext> = {}
): GetServerSidePropsContext =>
  ({
    params: { market: "sk", segments },
    query: {},
    req: {
      headers: {
        host: "herbatica.sk",
        "x-sf-canonical-origin": "https://herbatica.sk",
        "x-sf-market": "sk",
        "x-sf-route-key": "url-registry.resolve",
      },
      url: `/~sf/sk/url-registry/${segments.join("/")}?utm_source=mail`,
    },
    res: {
      setHeader: vi.fn(),
      statusCode: 200,
    },
    ...overrides,
  }) as unknown as GetServerSidePropsContext

describe("static URL Registry alias resolver", () => {
  beforeEach(() => {
    mocks.getUrlRegistryRuntime.mockReset()
  })

  it("returns one absolute 308 to the current same-market canonical path", async () => {
    mocks.getUrlRegistryRuntime.mockResolvedValue({
      enabled: true,
      registry: {
        resolveStaticPath: vi.fn().mockResolvedValue({
          kind: "found",
          value: {
            canonicalPathSegments: ["produkty", "Ashwagandha-AbC"],
            disposition: "alias",
            matchedPath: [],
            remainderSegments: ["Ashwagandha-AbC"],
            route: { market: "sk" },
          },
        }),
      },
    })

    await expect(
      getServerSideProps(context(["stare-produkty", "Ashwagandha-AbC"]))
    ).resolves.toEqual({
      redirect: {
        destination:
          "https://herbatica.sk/produkty/Ashwagandha-AbC?utm_source=mail",
        statusCode: 308,
      },
    })
  })

  it("fails closed for direct access, current projections, and cross-market data", async () => {
    const missingTrust = context(["stara-cesta"])
    missingTrust.req.headers["x-sf-route-key"] = "attacker"
    await expect(getServerSideProps(missingTrust)).resolves.toEqual({
      notFound: true,
    })

    for (const value of [
      { disposition: "current", route: { market: "sk" } },
      { disposition: "alias", route: { market: "cz" } },
    ]) {
      const responseContext = context(["stara-cesta"])
      mocks.getUrlRegistryRuntime.mockResolvedValue({
        enabled: true,
        registry: {
          resolveStaticPath: vi.fn().mockResolvedValue({
            kind: "found",
            value: {
              canonicalPathSegments: ["nova-cesta"],
              matchedPath: [],
              remainderSegments: [],
              ...value,
            },
          }),
        },
      })
      await expect(getServerSideProps(responseContext)).resolves.toEqual({
        props: { unavailable: true },
      })
      expect(responseContext.res.statusCode).toBe(503)
    }
  })
})
