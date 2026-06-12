"use client"

import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import { FallbackImage } from "@/components/fallback-image"
import type {
  SearchAutocompleteSuggestion,
  SearchAutocompleteSuggestionType,
} from "@/lib/search-autocomplete/search-autocomplete-types"

const TYPE_ICON: Record<
  Exclude<SearchAutocompleteSuggestionType, "product">,
  IconType
> = {
  brand: "token-icon-label",
  category: "token-icon-box",
}

export function SearchAutocompleteMedia({
  item,
}: {
  item: SearchAutocompleteSuggestion
}) {
  if (item.type === "product") {
    return (
      <span className="flex h-800 w-800 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-secondary bg-base">
        <FallbackImage
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain"
          height={56}
          src={item.imageUrl}
          width={56}
        />
      </span>
    )
  }

  return (
    <span className="flex h-700 w-700 shrink-0 items-center justify-center rounded-md bg-fill-secondary text-primary">
      <Icon icon={TYPE_ICON[item.type]} size="lg" />
    </span>
  )
}
