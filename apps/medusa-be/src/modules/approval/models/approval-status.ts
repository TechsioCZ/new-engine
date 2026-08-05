import { model } from "@medusajs/framework/utils"

import { ApprovalStatusType } from "../../../types/approval"

export const ApprovalStatus = model.define("approval_status", {
  cart_id: model.text(),
  id: model
    .id({
      prefix: "apprstat",
    })
    .primaryKey(),
  status: model.enum(ApprovalStatusType),
})
