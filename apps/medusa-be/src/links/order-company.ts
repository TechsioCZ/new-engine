import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"

import CompanyModule from "../modules/company"
import { parseLinkSource } from "./parse-link-source"

const orderModule = {
  linkable: {
    order: parseLinkSource(OrderModule.linkable["order"], "Order module order"),
  },
}

export default defineLink(
  orderModule.linkable.order,
  CompanyModule.linkable.company,
)
