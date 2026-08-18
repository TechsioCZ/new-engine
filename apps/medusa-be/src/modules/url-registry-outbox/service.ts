import { MedusaService } from "@medusajs/framework/utils"
import UrlRegistryOutboxEvent from "./models/url-registry-outbox-event"
import UrlRegistryOutboxStream from "./models/url-registry-outbox-stream"

class UrlRegistryOutboxModuleService extends MedusaService({
  UrlRegistryOutboxEvent,
  UrlRegistryOutboxStream,
}) {}

export default UrlRegistryOutboxModuleService
