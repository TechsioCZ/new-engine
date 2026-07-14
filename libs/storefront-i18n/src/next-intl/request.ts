import { getRequestConfig } from "next-intl/server"
import {
  type FlatStorefrontMessages,
  nestStorefrontMessages,
} from "../core/messages"
import type { StorefrontMarket } from "../core/markets"

type StorefrontRequestConfigOptions<TMarket extends StorefrontMarket> = {
  getMarket: () => Promise<TMarket> | TMarket
  getMessages: (
    market: TMarket
  ) => Promise<FlatStorefrontMessages> | FlatStorefrontMessages
}

export const createStorefrontRequestConfig = <
  TMarket extends StorefrontMarket,
>({
  getMarket,
  getMessages,
}: StorefrontRequestConfigOptions<TMarket>) =>
  getRequestConfig(async () => {
    const market = await getMarket()
    const messages = await getMessages(market)

    return {
      locale: market.locale,
      messages: nestStorefrontMessages(messages),
    }
  })
