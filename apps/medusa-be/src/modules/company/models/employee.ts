import { model } from "@medusajs/framework/utils"

import { Company } from "./company"

export const Employee = model.define("employee", {
  company: model.belongsTo(() => Company, {
    mappedBy: "employees",
  }),
  id: model
    .id({
      prefix: "emp",
    })
    .primaryKey(),
  is_admin: model.boolean().default(false),
  spending_limit: model.bigNumber().default(0),
})
