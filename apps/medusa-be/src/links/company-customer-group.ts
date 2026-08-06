import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"

import CompanyModule from "../modules/company"
import { parseLinkSource } from "./parse-link-source"

export default defineLink(
  CompanyModule.linkable.company,
  parseLinkSource(
    CustomerModule.linkable["customerGroup"],
    "Customer module customer group",
  ),
)
