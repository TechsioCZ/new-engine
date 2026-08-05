import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework"
import { authenticate } from "@medusajs/medusa"

import { ensureCompanyMember, ensureRole } from "../../middlewares/ensure-role"
import {
  storeCompanyQueryConfig,
  storeEmployeeQueryConfig,
} from "./query-config"
import {
  StoreCreateCompany,
  StoreCreateEmployee,
  StoreGetCompanyParams,
  StoreGetEmployeeParams,
  StoreUpdateApprovalSettings,
  StoreUpdateCompany,
  StoreUpdateEmployee,
} from "./validators"

export const storeCompaniesMiddlewares: MiddlewareRoute[] = [
  /* Company middlewares */
  {
    matcher: "/store/companies*",
    method: "ALL",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    matcher: "/store/companies",
    method: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.list,
      ),
    ],
  },
  {
    matcher: "/store/companies",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(StoreCreateCompany),
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/store/companies/:id",
    method: ["GET"],
    middlewares: [
      ensureCompanyMember,
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/store/companies/:id",
    method: ["POST"],
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformBody(StoreUpdateCompany),
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/store/companies/:id",
    method: ["DELETE"],
    middlewares: [ensureRole("company_admin")],
  },

  /* Employee middlewares */
  {
    matcher: "/store/companies/:id/employees",
    method: ["GET"],
    middlewares: [
      ensureCompanyMember,
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.list,
      ),
    ],
  },
  {
    matcher: "/store/companies/:id/employees",
    method: ["POST"],
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformBody(StoreCreateEmployee),
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.list,
      ),
    ],
  },
  {
    matcher: "/store/companies/:id/employees/:employee_id",
    method: ["GET"],
    middlewares: [
      ensureCompanyMember,
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/store/companies/:id/employees/:employee_id",
    method: ["POST"],
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformBody(StoreUpdateEmployee),
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/store/companies/:id/employees/:employee_id",
    method: ["DELETE"],
    middlewares: [ensureRole("company_admin")],
  },
  {
    matcher: "/store/companies/:id/approval-settings",
    method: ["POST"],
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformBody(StoreUpdateApprovalSettings),
    ],
  },
]
