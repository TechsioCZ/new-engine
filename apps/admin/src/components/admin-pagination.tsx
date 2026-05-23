import {
  type CreatePaginationGetPageUrlOptions,
  Pagination,
} from "@techsio/ui-kit/molecules/pagination"
import type { ComponentPropsWithoutRef } from "react"
import {
  Link as RouterLink,
  useLocation,
  useSearchParams,
} from "react-router-dom"

type AdminPaginationProps = {
  ariaLabel: string
  className?: string
  count: number
  offset: number
  onPageChange?: (page: number) => void
  pageSize: number
  searchParamOverrides?: CreatePaginationGetPageUrlOptions["searchParamOverrides"]
}

type RouterPaginationLinkProps = Omit<
  ComponentPropsWithoutRef<typeof RouterLink>,
  "to"
> & {
  href?: string
}

function RouterPaginationLink({ href, ...props }: RouterPaginationLinkProps) {
  return <RouterLink {...props} to={href || "."} />
}

export function AdminPagination({
  ariaLabel,
  className,
  count,
  offset,
  onPageChange,
  pageSize,
  searchParamOverrides,
}: AdminPaginationProps) {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  if (count <= 0 || pageSize <= 0) {
    return null
  }

  const page = Math.floor(offset / pageSize) + 1
  const rootClassName = ["flex justify-end", className]
    .filter(Boolean)
    .join(" ")

  return (
    <Pagination
      aria-label={ariaLabel}
      className={rootClassName}
      count={count}
      getPageUrl={({ page: nextPage }) => {
        const params = new URLSearchParams(searchParams)
        const nextOffset = (nextPage - 1) * pageSize

        for (const [key, value] of Object.entries(searchParamOverrides ?? {})) {
          if (value == null) {
            params.delete(key)
          } else {
            params.set(key, String(value))
          }
        }

        if (nextOffset > 0) {
          params.set("offset", String(nextOffset))
        } else {
          params.delete("offset")
        }

        const query = params.toString()
        return query ? `${location.pathname}?${query}` : location.pathname
      }}
      linkAs={RouterPaginationLink}
      onPageChange={onPageChange}
      page={page}
      pageSize={pageSize}
      size="md"
      variant="outlined"
    />
  )
}
