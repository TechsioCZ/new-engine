import { MedusaError } from "@medusajs/framework/utils"
import type { QueryResultRow } from "@neondatabase/serverless"
import { isRecord } from "@techsio/std/object"
import { drizzle } from "drizzle-orm/neon-http"
import type { SQL } from "drizzle-orm/sql/sql"

import {
  categories,
  collections,
  products,
  subcategories,
  subcollections,
  users,
} from "./schema"

const schema = {
  categories,
  collections,
  products,
  subcategories,
  subcollections,
  users,
}

// Create a simplified drizzle client
/*export const db = drizzle(
  'postgresql://neondb_owner:npg_Ozy4jRvtHDG5@ep-nameless-river-a2qn6c6z-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  { schema }
);*/
const db = drizzle(
  process.env["DATABASE_URL"] ??
    "postgresql://root:root@medusa-db:5432/medusa?sslmode=disable&options=-csearch_path%3Dmedusa%2Cpg_catalog",
  { schema },
)
export type SqlRowDecoder<T> = (
  row: Readonly<QueryResultRow>,
  index: number,
) => T

export const decodeSqlRows = <T>(
  value: unknown,
  decodeRow: SqlRowDecoder<T>,
): T[] => {
  if (!Array.isArray(value)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Raw SQL result rows must be an array",
    )
  }

  return value.map((row, index) => {
    if (!isRecord(row)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Raw SQL row ${index} must be an object`,
      )
    }
    return decodeRow(row, index)
  })
}

/** Execute raw SQL and decode every external database row. */
export const sqlRaw = async <T>(
  sql: SQL,
  decodeRow: SqlRowDecoder<T>,
): Promise<T[]> => {
  const result = await db.execute(sql)
  return decodeSqlRows(result.rows, decodeRow)
}
