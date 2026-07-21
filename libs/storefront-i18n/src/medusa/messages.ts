import type { Client } from "@medusajs/js-sdk"
import type { FlatStorefrontMessages } from "../core/messages"

export type LoadMedusaStorefrontMessagesInput = {
  cache?: RequestCache
  endpoint?: string
  locale: string
  market: string
}

type StorefrontMessagesResponse = {
  locale: string
  market: string
  messages: FlatStorefrontMessages
}

const isStorefrontMessagesResponse = (
  value: unknown,
  input: LoadMedusaStorefrontMessagesInput
): value is StorefrontMessagesResponse => {
  if (!value || typeof value !== "object") {
    return false
  }

  const locale = Reflect.get(value, "locale")
  const market = Reflect.get(value, "market")
  const messages = Reflect.get(value, "messages")

  if (
    locale !== input.locale ||
    market !== input.market ||
    !messages ||
    typeof messages !== "object" ||
    Array.isArray(messages)
  ) {
    return false
  }

  return Object.values(messages).every(
    (message) => typeof message === "string"
  )
}

export const loadMedusaStorefrontMessages = async (
  client: Pick<Client, "fetch">,
  input: LoadMedusaStorefrontMessagesInput
): Promise<FlatStorefrontMessages> => {
  const response = await client.fetch<unknown>(
    input.endpoint ?? "/store/storefront-texts",
    {
      cache: input.cache ?? "no-store",
      query: {
        locale: input.locale,
        market: input.market,
      },
    }
  )

  if (!isStorefrontMessagesResponse(response, input)) {
    throw new Error("Invalid storefront messages response.")
  }

  return response.messages
}
