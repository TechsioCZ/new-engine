import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  COMPANY_CHECK_MODULE,
  type CompanyCheckModuleService,
} from "../../../../modules/company-check"
import {
  mapViesResponse,
  parseVatIdentificationNumber,
} from "../../../../modules/company-check/utils"
import { TimeoutError } from "../../../../utils/http"
import type { StoreCompaniesCheckViesSchemaType } from "../../../store/companies/check/vies/validators"

export async function handleCompanyCheckViesGet(
  req: MedusaRequest<unknown, StoreCompaniesCheckViesSchemaType>,
  res: MedusaResponse
): Promise<void> {
  const companyCheckService =
    req.scope.resolve<CompanyCheckModuleService>(COMPANY_CHECK_MODULE)

  try {
    const { countryCode, vatNumber } = parseVatIdentificationNumber(
      req.validatedQuery.vat_identification_number
    )

    const response = await companyCheckService.checkVatNumber({
      countryCode,
      vatNumber,
    })
    res.json(mapViesResponse(response))
  } catch (error) {
    const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    logger.error(
      "VIES check failed",
      error instanceof Error ? error : new Error(String(error))
    )

    if (error instanceof TimeoutError) {
      res.status(504).json({
        error: "VIES request timed out",
      })
      return
    }

    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.INVALID_DATA
    ) {
      res.status(400).json({
        error: error.message || "Invalid VAT value",
      })
      return
    }

    res.status(502).json({
      error: "VIES request failed",
    })
  }
}
