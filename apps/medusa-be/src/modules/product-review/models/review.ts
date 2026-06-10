import { model } from "@medusajs/framework/utils"

const Review = model
  .define("review", {
    id: model.id().primaryKey(),
    title: model.text().searchable(),
    content: model.text(),
    rating: model.number(),
    status: model.text().searchable(),
    product_id: model.text(),
    customer_id: model.text(),
    first_name: model.text().nullable(),
    last_name: model.text().nullable(),
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
      name: "CHK_review_rating_range",
      expression: (columns) =>
        `${columns.rating} >= 1 AND ${columns.rating} <= 5`,
    },
    {
      name: "CHK_review_status",
      expression: (columns) =>
        `${columns.status} IN ('pending', 'approved', 'rejected')`,
    },
  ])

export default Review
