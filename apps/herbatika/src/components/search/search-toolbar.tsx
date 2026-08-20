"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"
import { useTranslations } from "next-intl"

type SearchToolbarProps = {
  query: string
  estimatedTotalHits: number
  hitsCount: number
  pageBadgeLabel: string
}

export function SearchToolbar({
  query,
  estimatedTotalHits,
  hitsCount,
  pageBadgeLabel,
}: SearchToolbarProps) {
  const tSearch = useTranslations("search")

  return (
    <>
      <div className="space-y-200">
        <h1 className="font-bold text-2xl text-fg-primary">
          {tSearch("results.title")}
        </h1>
        <p className="text-fg-secondary text-sm">
          {tSearch("results.description")}
        </p>
      </div>

      {query ? (
        <div className="flex flex-wrap items-center gap-200">
          <Badge variant="info">{tSearch("results.query", { query })}</Badge>
          <Badge variant="secondary">
            {tSearch("results.found", { count: estimatedTotalHits })}
          </Badge>
          <Badge variant="secondary">
            {tSearch("results.displayed", { count: hitsCount })}
          </Badge>
          <Badge variant="secondary">{pageBadgeLabel}</Badge>
        </div>
      ) : null}
    </>
  )
}
