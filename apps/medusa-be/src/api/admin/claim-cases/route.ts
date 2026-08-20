import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CLAIM_CASE_MODULE } from "../../../modules/claim-case"
import type ClaimCaseModuleService from "../../../modules/claim-case/service"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = Math.min(
    toPositiveInteger(req.query.limit, DEFAULT_LIMIT),
    MAX_LIMIT
  )
  const offset = toPositiveInteger(req.query.offset, 0)
  const service = req.scope.resolve<ClaimCaseModuleService>(CLAIM_CASE_MODULE)
  const [claimCases, count] = await service.listAndCountClaimCases(
    {},
    {
      order: { submitted_at: "DESC" },
      skip: offset,
      take: limit,
    }
  )

  res.json({ claim_cases: claimCases, count, limit, offset })
}
