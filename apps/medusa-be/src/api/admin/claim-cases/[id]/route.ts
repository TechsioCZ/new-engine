import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CLAIM_CASE_MODULE } from "../../../../modules/claim-case"
import type ClaimCaseModuleService from "../../../../modules/claim-case/service"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = req.params.id

  if (!id) {
    res.status(400).json({ message: "Claim case ID is required" })
    return
  }

  const service = req.scope.resolve<ClaimCaseModuleService>(CLAIM_CASE_MODULE)
  const claimCase = await service.retrieveClaimCase(id, {
    relations: ["items"],
  })

  res.json({ claim_case: claimCase })
}
