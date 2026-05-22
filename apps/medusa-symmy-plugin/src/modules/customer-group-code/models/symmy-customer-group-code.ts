import { model } from "@medusajs/framework/utils"

const SymmyCustomerGroupCode = model
  .define("symmy_customer_group_code", {
    id: model.id().primaryKey(),
    code: model.text().nullable(),
    erp_code: model.text().nullable(),
    customer_group_id: model.text(),
  })
  .indexes([
    {
      name: "IDX_symmy_customer_group_code_code_unique",
      on: ["code"],
      unique: true,
      where: "deleted_at IS NULL AND code IS NOT NULL",
    },
    {
      name: "IDX_symmy_customer_group_code_erp_code_unique",
      on: ["erp_code"],
      unique: true,
      where: "deleted_at IS NULL AND erp_code IS NOT NULL",
    },
    {
      name: "IDX_symmy_customer_group_code_group_id_unique",
      on: ["customer_group_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default SymmyCustomerGroupCode
