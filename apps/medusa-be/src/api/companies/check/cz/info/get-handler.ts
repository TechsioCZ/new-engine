import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { TimeoutError } from "../../../../../utils/http"
import { companyCheckCzInfoWorkflow } from "../../../../../workflows/company-check/workflows/company-info"
import type { StoreCompaniesCheckCzInfoSchemaType } from "../../../../store/companies/check/cz/info/validators"

export async function handleCompanyCheckCzInfoGet(
  req: MedusaRequest<unknown, StoreCompaniesCheckCzInfoSchemaType>,
  res: MedusaResponse
): Promise<void> {
  try {
    const { result } = await companyCheckCzInfoWorkflow(req.scope).run({
      input: req.validatedQuery,
    })

    res.json(result)
  } catch (error) {
    const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    logger.error(
      "Company info check failed",
      error instanceof Error ? error : new Error(String(error))
    )

    if (error instanceof TimeoutError) {
      res.status(504).json({
        error: "Company info request timed out",
      })
      return
    }

    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.INVALID_DATA
    ) {
      res.status(400).json({
        error: error.message || "Invalid company info query",
      })
      return
    }

    res.status(502).json({
      error: "Company info request failed",
    })
  }
}
