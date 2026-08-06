"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"

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
  return (
    <>
      <div className="space-y-200">
        <h1 className="font-bold text-2xl text-fg-primary">Vyhľadávanie</h1>
        <p className="text-fg-secondary text-sm">
          Vyhľadajte produkty v katalógu.
        </p>
      </div>

      {query ? (
        <div className="flex flex-wrap items-center gap-200">
          <Badge variant="info">{`dotaz: ${query}`}</Badge>
          <Badge variant="secondary">{`nájdené: ${estimatedTotalHits}`}</Badge>
          <Badge variant="secondary">{`zobrazené: ${hitsCount}`}</Badge>
          <Badge variant="secondary">{pageBadgeLabel}</Badge>
        </div>
      ) : null}
    </>
  )
}
