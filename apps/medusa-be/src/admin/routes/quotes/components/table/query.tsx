import { isRecord } from "@techsio/std/object"

import { useQueryParams } from "../../../../hooks/use-query-params"

const parseDateFilter = (
  value: string,
): Record<string, unknown> | undefined => {
  const parsed: unknown = JSON.parse(value)
  return isRecord(parsed) ? parsed : undefined
}

export const useQuotesTableQuery = ({
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

  const { offset, created_at, updated_at, ...rest } = raw
  const hasCreatedAt = created_at !== undefined && created_at.length > 0
  const hasUpdatedAt = updated_at !== undefined && updated_at.length > 0
  const searchParams = {
    ...(rest.q !== undefined && rest.q.length > 0 ? { q: rest.q } : {}),
    ...(rest.order !== undefined && rest.order.length > 0
      ? { order: rest.order }
      : {}),
    limit: pageSize,
    offset: offset !== undefined && offset.length > 0 ? Number(offset) : 0,
    ...(hasCreatedAt ? { created_at: parseDateFilter(created_at) } : {}),
    ...(hasUpdatedAt ? { updated_at: parseDateFilter(updated_at) } : {}),
  }

  return { raw, searchParams }
}
