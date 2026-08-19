"use client"

import { usePathname, useSearchParams } from "next/navigation"

export function usePaginationUrlBuilder(pageParam = "page") {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const basePathname = pathname ?? ""
  const baseSearchParams = searchParams?.toString() ?? ""

  return ({ page }: { page: number }) => {
    const params = new URLSearchParams(baseSearchParams)

    if (page <= 1) {
      params.delete(pageParam)
    } else {
      params.set(pageParam, String(page))
    }

    const query = params.toString()

    return query ? `${basePathname}?${query}` : basePathname
  }
}
