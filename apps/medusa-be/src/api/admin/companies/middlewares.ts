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
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.list,
      ),
    ],
  },
  {
    matcher: "/admin/companies",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminCreateCompany),
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminUpdateCompany),
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/customer-group",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminAddCompanyToCustomerGroup),
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/restore",
    methods: ["POST"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetCompanyParams,
        adminCompanyQueryConfig.retrieve,
      ),
    ],
  },

  /* Employees Middlewares */
  {
    matcher: "/admin/companies/:id/employees",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetEmployeeParams,
        adminEmployeeQueryConfig.list,
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/employees",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminCreateEmployee),
      validateAndTransformQuery(
        AdminGetEmployeeParams,
        adminEmployeeQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/employees/:employee_id",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetEmployeeParams,
        adminEmployeeQueryConfig.retrieve,
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/employees/:employee_id",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminUpdateEmployee),
      validateAndTransformQuery(
        AdminGetEmployeeParams,
        adminEmployeeQueryConfig.retrieve,
      ),
    ],
  },
  /* Approval Settings Middlewares */
  {
    matcher: "/admin/companies/:id/approval-settings",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(
        AdminGetApprovalSettingsParams,
        adminApprovalSettingsQueryConfig.list,
      ),
    ],
  },
  {
    matcher: "/admin/companies/:id/approval-settings",
    methods: ["POST"],
    middlewares: [
      validateAndTransformBody(AdminUpdateApprovalSettings),
      validateAndTransformQuery(
        AdminGetApprovalSettingsParams,
        adminApprovalSettingsQueryConfig.retrieve,
      ),
    ],
  },
]
