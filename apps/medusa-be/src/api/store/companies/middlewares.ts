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

const COMPANY_MATCHER = "/store/companies/:id"
const EMPLOYEE_MATCHER = "/store/companies/:id/employees/:employee_id"

export const storeCompaniesMiddlewares: MiddlewareRoute[] = [
  /* Company middlewares */
  {
    matcher: "/store/companies*",
    methods: ["ALL"],
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
  {
    matcher: "/store/companies",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.list,
      ),
    ],
  },
  {
    matcher: "/store/companies",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(StoreCreateCompany),
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: COMPANY_MATCHER,
    methods: ["GET"],
    middlewares: [
      ensureCompanyMember,
      validateAndTransformQuery(
        StoreGetCompanyParams,
        storeCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: COMPANY_MATCHER,
    methods: ["POST"],
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
    matcher: COMPANY_MATCHER,
    methods: ["DELETE"],
    middlewares: [ensureRole("company_admin")],
  },

  /* Employee middlewares */
  {
    matcher: "/store/companies/:id/employees",
    methods: ["GET"],
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
    methods: ["POST"],
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
    matcher: EMPLOYEE_MATCHER,
    methods: ["GET"],
    middlewares: [
      ensureCompanyMember,
      validateAndTransformQuery(
        StoreGetEmployeeParams,
        storeEmployeeQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: EMPLOYEE_MATCHER,
    methods: ["POST"],
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
    matcher: EMPLOYEE_MATCHER,
    methods: ["DELETE"],
    middlewares: [ensureRole("company_admin")],
  },
  {
    matcher: "/store/companies/:id/approval-settings",
    methods: ["POST"],
    middlewares: [
      ensureRole("company_admin"),
      validateAndTransformBody(StoreUpdateApprovalSettings),
    ],
  },
]
