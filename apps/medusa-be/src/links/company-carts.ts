import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"

import CompanyModule from "../modules/company"

export default defineLink(CompanyModule.linkable.company, {
  isList: true,
  linkable: CartModule.linkable["cart"],
})
