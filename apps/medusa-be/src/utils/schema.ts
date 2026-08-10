import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

export const users = pgTable(
  "users",
  {
    createdAt: timestamp("created_at", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    id: serial().primaryKey().notNull(),
    passwordHash: text().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    username: varchar({ length: 100 }).notNull(),
  },
  (table) => [uniqueIndex("users_username_unique").on(table.username)],
)

export const collections = pgTable("collections", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  slug: text().notNull(),
})

export const categories = pgTable(
  "categories",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id),
    imageUrl: text("image_url"),
    name: text().notNull(),
    slug: text().primaryKey().notNull(),
  },
  (table) => [index("categories_collection_id_idx").on(table.collectionId)],
)

export const subcollections = pgTable(
  "subcollections",
  {
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug),
    id: serial().primaryKey().notNull(),
    name: text().notNull(),
  },
  (table) => [index("subcollections_category_slug_idx").on(table.categorySlug)],
)

export const subcategories = pgTable(
  "subcategories",
  {
    imageUrl: text("image_url"),
    name: text().notNull(),
    slug: text().primaryKey().notNull(),
    subcollectionId: integer("subcollection_id")
      .notNull()
      .references(() => subcollections.id),
  },
  (table) => [
    index("subcategories_subcollection_id_idx").on(table.subcollectionId),
  ],
)

export const products = pgTable(
  "products",
  {
    description: text().notNull(),
    imageUrl: text("image_url"),
    name: text().notNull(),
    price: numeric().notNull(),
    slug: text().primaryKey().notNull(),
    subcategorySlug: text("subcategory_slug")
      .notNull()
      .references(() => subcategories.slug),
  },
  () => [],
)
