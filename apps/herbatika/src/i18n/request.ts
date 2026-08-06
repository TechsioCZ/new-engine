import { createStorefrontRequestConfig } from "@techsio/storefront-i18n/next-intl/request"
import { getMarketServerContext } from "@/lib/storefront/market-context.app"
import { fetchStorefrontTextMessages } from "@/lib/storefront/storefront-texts.server"

export default createStorefrontRequestConfig({
  getMarket: getMarketServerContext,
  getMessages: fetchStorefrontTextMessages,
})
