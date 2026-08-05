import { z } from "@medusajs/framework/zod"
import { createSelectParams } from "@medusajs/medusa/api/utils/validators"

import { ApprovalStatusType } from "../../../types/approval"

/* Company Validators */
export type StoreGetCompanyParamsType = z.infer<typeof StoreGetCompanyParams>
export const StoreGetCompanyParams = createSelectParams()

export type StoreCreateCompanyType = z.infer<typeof StoreCreateCompany>
export const StoreCreateCompany = z
  .object({
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    currency_code: z.string(),
    email: z.string(),
    logo_url: z.string().optional().nullable(),
    name: z.string(),
    phone: z.string().optional().nullable(),
    spending_limit_reset_frequency: z
      .enum(["never", "daily", "weekly", "monthly", "yearly"])
      .optional()
      .nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
  })
  .strict()

export type StoreUpdateCompanyType = z.infer<typeof StoreUpdateCompany>
export const StoreUpdateCompany = z
  .object({
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    currency_code: z.string().optional(),
    email: z.string().optional(),
    logo_url: z.string().optional().nullable(),
    name: z.string().optional(),
    phone: z.string().optional().nullable(),
    spending_limit_reset_frequency: z
      .enum(["never", "daily", "weekly", "monthly", "yearly"])
      .optional()
      .nullable(),
    state: z.string().optional().nullable(),
    zip: z.string().optional().nullable(),
  })
  .strict()

/* Employee Validators */
export type StoreGetEmployeeParamsType = z.infer<typeof StoreGetEmployeeParams>
export const StoreGetEmployeeParams = createSelectParams()

export type StoreCreateEmployeeType = z.infer<typeof StoreCreateEmployee>
export const StoreCreateEmployee = z
  .object({
    customer_id: z.string(),
    is_admin: z.boolean().optional().nullable().default(false),
    spending_limit: z.number().optional().nullable(),
  })
  .strict()

export type StoreUpdateEmployeeType = z.infer<typeof StoreUpdateEmployee>
export const StoreUpdateEmployee = z
  .object({
    is_admin: z.boolean().optional(),
    raw_spending_limit: z
      .object({
        value: z.number().optional(),
        precision: z.number().optional(),
      })
      .optional(),
    spending_limit: z.number().optional(),
  })
  .strict()

/* Approval Settings Validators */
export type StoreGetApprovalSettingsParamsType = z.infer<
  typeof StoreGetApprovalSettingsParams
>
export const StoreGetApprovalSettingsParams = createSelectParams()

export type StoreUpdateApprovalSettingsType = z.infer<
  typeof StoreUpdateApprovalSettings
>
export const StoreUpdateApprovalSettings = z
  .object({
    requires_admin_approval: z.boolean(),
  })
  .strict()

/* Approval Validators */
export type StoreGetApprovalParamsType = z.infer<typeof StoreGetApprovalParams>
export const StoreGetApprovalParams = createSelectParams()

export type StoreUpdateApprovalType = z.infer<typeof StoreUpdateApproval>
export const StoreUpdateApproval = z.object({
  handled_by: z.string(),
  status: z.nativeEnum(ApprovalStatusType),
})

export type StoreDeleteApprovalType = z.infer<typeof StoreDeleteApproval>
export const StoreDeleteApproval = z.object({
  id: z.string(),
})
