import { MedusaService } from "@medusajs/framework/utils"
import ClaimAccess from "./models/claim-access"
import ClaimCase from "./models/claim-case"
import ClaimItem from "./models/claim-item"

class ClaimCaseModuleService extends MedusaService({
  ClaimAccess,
  ClaimCase,
  ClaimItem,
}) {}

export default ClaimCaseModuleService
