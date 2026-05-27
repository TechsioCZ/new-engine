import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"
import ApprovalModule from "../modules/approval"

export default defineLink(CartModule.linkable.cart, {
  linkable: ApprovalModule.linkable.approval,
  deleteCascade: true,
  isList: true,
})
