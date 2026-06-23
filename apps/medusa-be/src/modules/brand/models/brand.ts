import { model } from "@medusajs/framework/utils"
import BrandAttribute from "./brand-attribute"

const Brand = model
  .define("brand", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    handle: model.text().searchable(),
    gpsrContactEmail: model.text().nullable(),
    gpsrEuropeanResellerContactEmail: model.text().nullable(),
    gpsrEuropeanResellerManufacturingCompanyName: model.text().nullable(),
    gpsrEuropeanResellerPostalAddress: model.text().nullable(),
    gpsrManufacturedOutsideEu: model.boolean().default(false),
    gpsrManufacturingCompanyName: model.text().nullable(),
    gpsrPostalAddress: model.text().nullable(),
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
