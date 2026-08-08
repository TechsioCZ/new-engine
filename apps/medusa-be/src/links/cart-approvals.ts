import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"

import ApprovalModule from "../modules/approval"
import { parseLinkSource } from "./parse-link-source"

const cartModule = {
  linkable: {
    cart: parseLinkSource(CartModule.linkable["cart"], "Cart module cart"),
  },
}

export default defineLink(cartModule.linkable.cart, {
  deleteCascade: true,
  isList: true,
  linkable: ApprovalModule.linkable.approval,
})
