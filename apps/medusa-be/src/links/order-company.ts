import { defineLink, Modules } from "@medusajs/framework/utils"

import CompanyModule from "../modules/company"

export default defineLink(
  {
    entity: "Order",
    field: "order",
    linkable: "order_id",
    primaryKey: "id",
    serviceName: Modules.ORDER,
  },
  CompanyModule.linkable.company,
)
