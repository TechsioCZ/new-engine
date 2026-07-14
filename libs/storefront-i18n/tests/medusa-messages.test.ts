import type { Client, FetchArgs, FetchInput } from "@medusajs/js-sdk"
import { describe, expect, it } from "vitest"
import { loadMedusaStorefrontMessages } from "../src/medusa/messages"

const createClient = (response: unknown) => {
  const calls: Array<[FetchInput, FetchArgs | undefined]> = []
  const client = {
    async fetch<T>(input: FetchInput, init?: FetchArgs): Promise<T> {
      calls.push([input, init])
      return response as T
    },
  } satisfies Pick<Client, "fetch">

  return {
    calls,
    client,
  }
}

describe("loadMedusaStorefrontMessages", () => {
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
      })
    ).resolves.toEqual({ "cart.title": "Košík" })

    expect(calls).toEqual([
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
      })
    ).rejects.toThrow("Invalid storefront messages response.")
  })
})
