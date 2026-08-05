import { model } from "@medusajs/framework/utils"

const Review = model
  .define("review", {
    content: model.text(),
    customer_id: model.text(),
    first_name: model.text().nullable(),
    id: model.id().primaryKey(),
    last_name: model.text().nullable(),
    product_id: model.text(),
    rating: model.number(),
    status: model.text().searchable(),
    title: model.text().searchable(),
  })
  .indexes([
    {
      name: "IDX_review_product_id",
      on: ["product_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_review_customer_product_unique",
      on: ["customer_id", "product_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_review_status_product_id",
      on: ["status", "product_id"],
      where: "deleted_at IS NULL",
    },
  ])
  .checks([
    {
      expression: (columns) =>
        `${columns.rating} >= 1 AND ${columns.rating} <= 5`,
      name: "CHK_review_rating_range",
    },
    {
      expression: (columns) =>
        `${columns.status} IN ('pending', 'approved', 'rejected')`,
      name: "CHK_review_status",
    },
  ])

export default Review
