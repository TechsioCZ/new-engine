import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/medusa"

import {
  adminApprovalSettingsQueryConfig,
  adminCompanyQueryConfig,
  adminEmployeeQueryConfig,
} from "./query-config"
import {
  AdminAddCompanyToCustomerGroup,
  AdminCreateCompany,
  AdminCreateEmployee,
  AdminGetApprovalSettingsParams,
  AdminGetCompanyParams,
  AdminGetEmployeeParams,
  AdminUpdateApprovalSettings,
  AdminUpdateCompany,
  AdminUpdateEmployee,
} from "./validators"

export const adminCompaniesMiddlewares: MiddlewareRoute[] = [
  /* Companies Middlewares */
  {
    matcher: "/admin/companies",
    method: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.list
      ),
    ],
  },
  {
    matcher: "/admin/companies",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminCreateCompany),
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id",
    method: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminUpdateCompany),
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/customer-group",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminAddCompanyToCustomerGroup),
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/restore",
    method: ["POST"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve
      ),
    ],
  },

  /* Employees Middlewares */
  {
    matcher: "/admin/companies/:id/employees",
    method: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetEmployeeParams,
        adminEmployeeQueryConfig.list
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/employees",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminCreateEmployee),
      validateAndTransformQuery(
        AdminGetEmployeeParams,
        adminEmployeeQueryConfig.retrieve
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/employees/:employee_id",
    method: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetEmployeeParams,
        adminEmployeeQueryConfig.retrieve
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/employees/:employee_id",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminUpdateEmployee),
      validateAndTransformQuery(
        AdminGetEmployeeParams,
        adminEmployeeQueryConfig.retrieve
      ),
    ],
  },
  /* Approval Settings Middlewares */
  {
    matcher: "/admin/companies/:id/approval-settings",
    method: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetApprovalSettingsParams,
        adminApprovalSettingsQueryConfig.list
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/approval-settings",
    method: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminUpdateApprovalSettings),
      validateAndTransformQuery(
        AdminGetApprovalSettingsParams,
        adminApprovalSettingsQueryConfig.retrieve
      ),
    ],
  },
]
