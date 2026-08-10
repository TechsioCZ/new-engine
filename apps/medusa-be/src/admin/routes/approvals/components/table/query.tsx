import { z } from "@medusajs/framework/zod"
import { omitUndefined } from "@techsio/std/object"

import { useQueryParams } from "../../../../hooks/use-query-params"

const dateFilterSchema = z.record(z.string(), z.string())

const parseFilter = (value: string | undefined) => {
  let parsed: unknown = null
  if (value !== undefined) {
    try {
      parsed = JSON.parse(value)
    } catch {
      parsed = null
    }
  }
  return dateFilterSchema.safeParse(parsed).data
}

export const useApprovalsTableQuery = ({
  pageSize = 50,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    ["q", "offset", "order", "created_at", "updated_at", "status"],
    prefix,
  )

  const { offset, created_at, updated_at, ...rest } = raw
  const searchParams = omitUndefined({
    ...rest,
    created_at: parseFilter(created_at),
    limit: pageSize,
    offset: offset === null ? 0 : Number(offset),
    updated_at: parseFilter(updated_at),
  })

  return { raw, searchParams }
}
