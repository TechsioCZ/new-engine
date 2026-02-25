import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { TimeoutError } from "../../../../../../utils/http"
import { companyCheckCzAddressCountWorkflow } from "../../../../../../workflows/company-check/workflows/address-count"
import type { AdminCompaniesCheckCzAddressCountSchemaType } from "./validators"

/**
 * GET /admin/companies/check/cz/address-count
 */
export async function GET(
  req: MedusaRequest<unknown, AdminCompaniesCheckCzAddressCountSchemaType>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { result } = await companyCheckCzAddressCountWorkflow(req.scope).run({
      input: req.validatedQuery,
    })

    res.json(result)
  } catch (error) {
    const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    logger.error(
      "ARES address count check failed",
      error instanceof Error ? error : new Error(String(error))
    )

    if (error instanceof TimeoutError) {
      res.status(504).json({
        error: "ARES request timed out",
      })
      return
    }

    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.INVALID_DATA
    ) {
      res.status(400).json({
        error: error.message || "Invalid address query",
      })
      return
    }

    res.status(502).json({
      error: "ARES request failed",
    })
  }
}
