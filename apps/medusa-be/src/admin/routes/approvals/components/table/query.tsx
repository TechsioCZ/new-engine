import { isRecord } from "@techsio/std/object"

import { useQueryParams } from "../../../../hooks/use-query-params"

const parseFilter = (
  value: string | null | undefined,
): Record<string, unknown> | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
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
  const searchParams = {
    ...rest,
    created_at: parseFilter(created_at),
    limit: pageSize,
    offset: offset === null ? 0 : Number(offset),
    updated_at: parseFilter(updated_at),
  }

  return { raw, searchParams }
}
