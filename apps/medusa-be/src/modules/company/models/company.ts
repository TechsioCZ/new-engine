import { model } from "@medusajs/framework/utils"

let employeeReference: typeof Employee

export const Company = model.define("company", {
  address: model.text().nullable(),
  city: model.text().nullable(),
  country: model.text().nullable(),
  currency_code: model.text().nullable(),
  email: model.text(),
  employees: model.hasMany(() => employeeReference),
  id: model
    .id({
      prefix: "comp",
    })
    .primaryKey(),
  logo_url: model.text().nullable(),
  name: model.text(),
  phone: model.text().nullable(),
  spending_limit_reset_frequency: model
    .enum(["never", "daily", "weekly", "monthly", "yearly"])
    .default("monthly"),
  state: model.text().nullable(),
  zip: model.text().nullable(),
})

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

const initializeEmployeeReference = () => {
  employeeReference = Employee
}

initializeEmployeeReference()
