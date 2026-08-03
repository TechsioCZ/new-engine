import { useQueryParams } from "../../../../../hooks/use-query-params"

export const useManageItemsTableQuery = ({
  pageSize = 50,
  prefix,
}: {
  pageSize?: number
  prefix?: string
}) => {
  const raw = useQueryParams(
    ["q", "offset", "order", "created_at", "updated_at"],
    prefix
  )

  const { offset, created_at, updated_at, ...rest } = raw
  const searchParams = {
    ...(rest.q ? { q: rest.q } : {}),
    ...(rest.order ? { order: rest.order } : {}),
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    ...(created_at ? { created_at: JSON.parse(created_at) } : {}),
    ...(updated_at ? { updated_at: JSON.parse(updated_at) } : {}),
  }

  return { searchParams, raw }
}
