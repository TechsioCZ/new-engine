import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"

import ApprovalModule from "../modules/approval"

export default defineLink(CartModule.linkable["cart"], {
  deleteCascade: true,
  isList: true,
  linkable: ApprovalModule.linkable.approval,
})
