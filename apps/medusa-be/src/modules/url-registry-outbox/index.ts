import { Module } from "@medusajs/framework/utils"
import { URL_REGISTRY_OUTBOX_MODULE } from "./constants"
import UrlRegistryOutboxModuleService from "./service"

export default Module(URL_REGISTRY_OUTBOX_MODULE, {
  service: UrlRegistryOutboxModuleService,
})

export { URL_REGISTRY_OUTBOX_MODULE } from "./constants"
export type {
  NormalizedProductLifecycleEvent,
  ProductLifecycleEventPayloadV1,
  ProductLifecycleReason,
  UrlRegistryOutboxMarket,
} from "./types"
