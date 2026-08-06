import { z } from "@medusajs/framework/zod"

import { useQueryParams } from "../../../../../hooks/use-query-params"

const dateFilterSchema = z.record(z.string(), z.string())

const parseDateFilter = (value: string) => {
  const parsed: unknown = JSON.parse(value)
  return dateFilterSchema.parse(parsed)
}

export const useManageItemsTableQuery = ({
  pageSize = 50,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    ["q", "offset", "order", "created_at", "updated_at"],
    prefix,
  )

  const { offset, created_at, updated_at, q: query, order } = raw
  const searchParams = {
    ...(query !== undefined && query.length > 0 ? { q: query } : {}),
    ...(order !== undefined && order.length > 0 ? { order } : {}),
    limit: pageSize,
    offset: offset !== undefined && offset.length > 0 ? Number(offset) : 0,
    ...(created_at !== undefined && created_at.length > 0
      ? { created_at: parseDateFilter(created_at) }
      : {}),
    ...(updated_at !== undefined && updated_at.length > 0
      ? { updated_at: parseDateFilter(updated_at) }
      : {}),
  }

  return { raw, searchParams }
}
