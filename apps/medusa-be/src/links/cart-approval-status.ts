import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"

import ApprovalModule from "../modules/approval"
import { parseNestedSerializedLinkSource } from "./parse-link-source"

const cartModule = {
  linkable: {
    cart: {
      id: parseNestedSerializedLinkSource(
        CartModule.linkable["cart"],
        "id",
        "Cart module cart id",
      ),
    },
  },
}

export default defineLink(
  { ...cartModule.linkable.cart.id },
  {
    deleteCascade: true,
    linkable: ApprovalModule.linkable.approvalStatus,
  },
)
