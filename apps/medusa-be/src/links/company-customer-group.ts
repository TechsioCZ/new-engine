import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import CompanyModule from "../modules/company"

export const CompanyCustomerGroupLink = defineLink(
  CompanyModule.linkable.company,
  CustomerModule.linkable.customerGroup
)

export default CompanyCustomerGroupLink
