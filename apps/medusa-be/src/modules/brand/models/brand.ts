import { model } from "@medusajs/framework/utils"

let brandAttributeReference: typeof BrandAttribute

const Brand = model
  .define("brand", {
    attributes: model.hasMany(() => brandAttributeReference, {
      mappedBy: "brand",
    }),
    gpsr_contact_email: model.text().nullable(),
    gpsr_european_reseller_contact_email: model.text().nullable(),
    gpsr_european_reseller_manufacturing_company_name: model.text().nullable(),
    gpsr_european_reseller_postal_address: model.text().nullable(),
    gpsr_manufactured_outside_eu: model.boolean().default(false),
    gpsr_manufacturing_company_name: model.text().nullable(),
    gpsr_postal_address: model.text().nullable(),
    handle: model.text().searchable(),
    id: model.id().primaryKey(),
    title: model.text().searchable(),
  })
  .indexes([
    {
      name: "IDX_brand_handle_unique",
      on: ["handle"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export const BrandAttributeType = model
  .define("brand_attribute_type", {
    attributes: model.hasMany(() => brandAttributeReference, {
      mappedBy: "attributeType",
    }),
    id: model.id().primaryKey(),
    name: model.text(),
  })
  .indexes([
    {
      name: "IDX_brand_attribute_type_name_unique",
      on: ["name"],
      unique: true,
      where: { deleted_at: null },
    },
  ])

export const BrandAttribute = model.define("brand_attribute", {
  attributeType: model.belongsTo(() => BrandAttributeType, {
    mappedBy: "attributes",
  }),
  brand: model.belongsTo(() => Brand, {
    mappedBy: "attributes",
  }),
  id: model.id().primaryKey(),
  value: model.text(),
})

const initializeBrandAttributeReference = () => {
  brandAttributeReference = BrandAttribute
}

initializeBrandAttributeReference()

export default Brand
