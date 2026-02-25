import { validateAndTransformQuery } from "@medusajs/framework"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  MiddlewareRoute,
} from "@medusajs/framework/http"
import { AdminCompaniesCheckCzAddressCountSchema } from "../../admin/companies/check/cz/address-count/validators"
import { AdminCompaniesCheckCzTaxReliabilitySchema } from "../../admin/companies/check/cz/tax-reliability/validators"
import { StoreCompaniesCheckCzInfoSchema } from "../../store/companies/check/cz/info/validators"
import { StoreCompaniesCheckViesSchema } from "../../store/companies/check/vies/validators"

const requireCompanyFeatureEnabled = (
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void => {
  if (process.env.FEATURE_COMPANY_ENABLED !== "1") {
    res.status(503).json({
      error: "Company check service is not enabled",
    })
    return
  }
  next()
}

export const companiesCheckRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/companies/check/cz/info",
    middlewares: [
      requireCompanyFeatureEnabled,
      validateAndTransformQuery(StoreCompaniesCheckCzInfoSchema, {
        isList: false,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/companies/check/cz/info",
    middlewares: [
      requireCompanyFeatureEnabled,
      validateAndTransformQuery(StoreCompaniesCheckCzInfoSchema, {
        isList: false,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/companies/check/vies",
    middlewares: [
      requireCompanyFeatureEnabled,
      validateAndTransformQuery(StoreCompaniesCheckViesSchema, {
        isList: false,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/companies/check/vies",
    middlewares: [
      requireCompanyFeatureEnabled,
      validateAndTransformQuery(StoreCompaniesCheckViesSchema, {
        isList: false,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/companies/check/cz/tax-reliability",
    middlewares: [
      requireCompanyFeatureEnabled,
      validateAndTransformQuery(AdminCompaniesCheckCzTaxReliabilitySchema, {
        isList: false,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/companies/check/cz/address-count",
    middlewares: [
      requireCompanyFeatureEnabled,
      validateAndTransformQuery(AdminCompaniesCheckCzAddressCountSchema, {
        isList: false,
      }),
    ],
  },
]
