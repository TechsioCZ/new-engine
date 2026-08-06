import type { FetchArgs, FetchInput } from "@medusajs/js-sdk"

import type { FlatStorefrontMessages } from "../core/messages"

export interface LoadMedusaStorefrontMessagesInput {
  cache?: RequestCache
  endpoint?: string
  locale: string
  market: string
}

interface MedusaStorefrontMessagesClient {
  fetch: (input: FetchInput, init?: FetchArgs) => Promise<unknown>
}

interface StorefrontMessagesResponse {
  locale: string
  market: string
  messages: FlatStorefrontMessages
}

const isStorefrontMessagesResponse = (
  value: unknown,
  input: LoadMedusaStorefrontMessagesInput,
): value is StorefrontMessagesResponse => {
  if (value === null || typeof value !== "object") {
    return false
  }

  const locale: unknown = Reflect.get(value, "locale")
  const market: unknown = Reflect.get(value, "market")
  const messages: unknown = Reflect.get(value, "messages")

  if (locale !== input.locale || market !== input.market) {
    return false
  }

  if (
    messages === null ||
    typeof messages !== "object" ||
    Array.isArray(messages)
  ) {
    return false
  }

  const messageValues: readonly unknown[] = Object.values(messages)
  return messageValues.every((message) => typeof message === "string")
}

export const loadMedusaStorefrontMessages = async (
  client: MedusaStorefrontMessagesClient,
  input: LoadMedusaStorefrontMessagesInput,
): Promise<FlatStorefrontMessages> => {
  const response = await client.fetch(
    input.endpoint ?? "/store/storefront-texts",
    {
      cache: input.cache ?? "no-store",
      query: {
        locale: input.locale,
        market: input.market,
      },
    },
  )

  if (!isStorefrontMessagesResponse(response, input)) {
    throw new Error("Invalid storefront messages response.")
  }

  return response.messages
}
