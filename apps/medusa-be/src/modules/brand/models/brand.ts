import { model } from "@medusajs/framework/utils"
import BrandAttribute from "./brand-attribute"

const Brand = model
  .define("brand", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    handle: model.text().searchable(),
    gpsr_contact_email: model.text().nullable(),
    gpsr_european_reseller_contact_email: model.text().nullable(),
    gpsr_european_reseller_manufacturing_company_name: model.text().nullable(),
    gpsr_european_reseller_postal_address: model.text().nullable(),
    gpsr_manufactured_outside_eu: model.boolean().default(false),
    gpsr_manufacturing_company_name: model.text().nullable(),
    gpsr_postal_address: model.text().nullable(),
    attributes: model.hasMany(() => BrandAttribute, {
      mappedBy: "brand",
    }),
  })
  .indexes([
    {
      name: "IDX_brand_handle_unique",
      on: ["handle"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export default Brand
