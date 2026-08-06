import { z } from "@medusajs/framework/zod"
import {
  createFindParams,
  createOperatorMap,
} from "@medusajs/medusa/api/utils/validators"

import {
  ApprovalStatusType,
  ApprovalType,
} from "../../../types/approval/module"

export type StoreGetApprovalsType = z.infer<typeof StoreGetApprovals>
export const StoreGetApprovals = createFindParams()
  .extend({
    status: z
      .union([z.string(), z.array(z.string()), createOperatorMap()])
      .optional(),
    type: z
      .union([
        z.enum(ApprovalType),
        z.array(z.enum(ApprovalType)),
        createOperatorMap(),
      ])
      .optional(),
  })
  .strict()

export type StoreUpdateApprovalType = z.infer<typeof StoreUpdateApproval>
export const StoreUpdateApproval = z.object({
  status: z.enum(ApprovalStatusType),
})
