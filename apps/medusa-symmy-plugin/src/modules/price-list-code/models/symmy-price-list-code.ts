import { model } from "@medusajs/framework/utils"

const SymmyPriceListCode = model
  .define("symmy_price_list_code", {
    code: model.id().primaryKey(),
    erp_code: model.text().searchable(),
    price_list_id: model.text().searchable(),
  })
  .indexes([
    {
      name: "IDX_symmy_price_list_code_erp_code_unique",
      on: ["erp_code"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_symmy_price_list_code_price_list_id_unique",
      on: ["price_list_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default SymmyPriceListCode
