import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"

import CompanyModule from "../modules/company"
import { parseLinkSource } from "./parse-link-source"

const cartModule = {
  linkable: {
    cart: parseLinkSource(CartModule.linkable["cart"], "Cart module cart"),
  },
}

export default defineLink(CompanyModule.linkable.company, {
  isList: true,
  linkable: cartModule.linkable.cart,
})
