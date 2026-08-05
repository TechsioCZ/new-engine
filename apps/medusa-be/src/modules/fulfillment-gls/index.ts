import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import GLSFulfillmentProviderService from "./service"

export { GLS_PROVIDER_IDENTIFIER } from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [GLSFulfillmentProviderService],
})
