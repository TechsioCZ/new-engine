import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import PplFulfillmentProviderService from "./service"

export { PPL_PROVIDER_IDENTIFIER } from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [PplFulfillmentProviderService],
})
