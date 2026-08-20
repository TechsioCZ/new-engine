import { Module } from "@medusajs/framework/utils"
import MarketVariantAuthorityModuleService from "./service"

export const MARKET_VARIANT_AUTHORITY_MODULE = "market_variant_authority"

export default Module(MARKET_VARIANT_AUTHORITY_MODULE, {
  service: MarketVariantAuthorityModuleService,
})
