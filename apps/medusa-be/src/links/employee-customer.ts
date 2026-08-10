import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import CompanyModule from "../modules/company"
import { parseLinkSource } from "./parse-link-source"

const customerModule = {
  linkable: {
    customer: parseLinkSource(
      CustomerModule.linkable["customer"],
      "Customer module customer",
    ),
  },
}

export default defineLink(
  CompanyModule.linkable.employee,
  customerModule.linkable.customer,
)
