import { model } from "@medusajs/framework/utils"

import {
  ApprovalStatusType,
  ApprovalType,
} from "../../../types/approval/module"

export const Approval = model.define("approval", {
  cart_id: model.text(),
  created_by: model.text(),
  handled_by: model.text().nullable(),
  id: model
    .id({
      prefix: "appr",
    })
    .primaryKey(),
  status: model.enum(ApprovalStatusType),
  type: model.enum(ApprovalType),
})
