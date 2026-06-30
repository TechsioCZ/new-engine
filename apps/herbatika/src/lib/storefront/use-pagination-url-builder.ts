"use client"

import { usePathname, useSearchParams } from "next/navigation"

export function usePaginationUrlBuilder(pageParam = "page") {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return ({ page }: { page: number }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (page <= 1) {
      params.delete(pageParam)
    } else {
      params.set(pageParam, String(page))
    }

    const query = params.toString()

    return query ? `${pathname}?${query}` : pathname
  }
}
