"use client"

import { useLocale } from "@payloadcms/ui"
import type { TextFieldClientComponent } from "payload"
import { useCallback } from "react"
import {
  normalizeReferenceSearch,
  RemoteReferenceField,
  type RemoteReferenceOption,
} from "./remote-reference-field"

type ArticleOption = {
  id?: number | string
  slug: string
  title: string
  thumbnail?: null | string
}

type ArticleLookupResponse = {
  articles?: ArticleOption[]
}

const fetchArticleOptions = async ({
  currentValue,
  locale,
  search,
  signal,
}: {
  currentValue: string
  locale?: string
  search: string
  signal: AbortSignal
}): Promise<RemoteReferenceOption[]> => {
  const params = new URLSearchParams({ limit: "20" })
  const query = normalizeReferenceSearch(search || currentValue)
  if (query) {
    params.set("search", query)
  }
  if (locale) {
    params.set("locale", locale)
  }

  const response = await fetch(`/api/article-options?${params}`, {
    credentials: "include",
    signal,
  })
  if (!response.ok) {
    throw new Error(`Article lookup failed (${response.status})`)
  }

  const data = (await response.json()) as ArticleLookupResponse
  return (data.articles ?? []).map((article) => ({
    id: article.id,
    label: `${article.title} (${article.slug})`,
    previewLabel: article.slug,
    thumbnail: article.thumbnail,
    value: article.slug,
  }))
}

export const ArticleSlugField: TextFieldClientComponent = (props) => {
  const locale = useLocale()
  const loadOptions = useCallback(
    (input: Omit<Parameters<typeof fetchArticleOptions>[0], "locale">) =>
      fetchArticleOptions({ ...input, locale: locale?.code }),
    [locale?.code]
  )

  return (
    <RemoteReferenceField
      {...props}
      emptyLabel="Select article…"
      loadingLabel="Loading articles…"
      loadOptions={loadOptions}
      searchPlaceholder="Search articles…"
    />
  )
}

export default ArticleSlugField
