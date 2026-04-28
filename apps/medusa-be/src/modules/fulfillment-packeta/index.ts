import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PacketaFulfillmentProviderService from "./service"

export { PACKETA_PROVIDER_IDENTIFIER } from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [PacketaFulfillmentProviderService],
})
