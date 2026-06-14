import { z } from "@medusajs/framework/zod"
import {
  createFindParams,
  createOperatorMap,
} from "@medusajs/medusa/api/utils/validators"

export type AdminGetApprovalsType = z.infer<typeof AdminGetApprovals>
export const AdminGetApprovals = createFindParams()
  .merge(
    z.object({
      status: z
        .union([z.string(), z.array(z.string()), createOperatorMap()])
        .optional(),
    })
  )
  .strict()

export type AdminUpdateApprovalType = z.infer<typeof AdminUpdateApproval>
export const AdminUpdateApproval = z.object({
  status: z.string(),
})
