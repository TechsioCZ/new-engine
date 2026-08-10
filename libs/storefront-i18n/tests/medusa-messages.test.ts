import type { FetchArgs, FetchInput } from "@medusajs/js-sdk"
import { describe, expect, it, vi } from "vitest"

import { loadMedusaStorefrontMessages } from "../src/medusa/messages"

const createClient = (response: unknown) => {
  const fetch =
    vi.fn<(input: FetchInput, init?: FetchArgs) => Promise<unknown>>()
  fetch.mockResolvedValue(response)

  return {
    calls: fetch.mock.calls,
    client: { fetch },
  }
}

describe(loadMedusaStorefrontMessages, () => {
  it("loads the exact market and locale without caching", async () => {
    const { calls, client } = createClient({
      locale: "cs-CZ",
      market: "cz",
      messages: { "cart.title": "Košík" },
    })

    await expect(
      loadMedusaStorefrontMessages(client, {
        locale: "cs-CZ",
        market: "cz",
      }),
    ).resolves.toStrictEqual({ "cart.title": "Košík" })

    expect(calls).toStrictEqual([
      [
        "/store/storefront-texts",
        {
          cache: "no-store",
          query: {
            locale: "cs-CZ",
            market: "cz",
          },
        },
      ],
    ])
  })

  it("rejects a response for a different locale", async () => {
    const { client } = createClient({
      locale: "sk-SK",
      market: "cz",
      messages: { "cart.title": "Košík" },
    })

    await expect(
      loadMedusaStorefrontMessages(client, {
        locale: "cs-CZ",
        market: "cz",
      }),
    ).rejects.toThrow("Invalid storefront messages response.")
  })

  it.each([
    { locale: 42, market: "cz", messages: { "cart.title": "Košík" } },
    { locale: "cs-CZ", market: "sk", messages: { "cart.title": "Košík" } },
    { locale: "cs-CZ", market: "cz", messages: null },
    { locale: "cs-CZ", market: "cz", messages: [] },
    { locale: "cs-CZ", market: "cz", messages: { "cart.title": 42 } },
  ])("rejects malformed external response %#", async (response) => {
    const { client } = createClient(response)

    await expect(
      loadMedusaStorefrontMessages(client, {
        locale: "cs-CZ",
        market: "cz",
      }),
    ).rejects.toThrow("Invalid storefront messages response.")
  })
})
