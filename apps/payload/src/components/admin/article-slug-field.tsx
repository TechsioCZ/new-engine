"use client"

import { FieldError, FieldLabel, useField, useLocale } from "@payloadcms/ui"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

type ArticleOption = {
  id?: number | string
  slug: string
  title: string
  thumbnail?: null | string
}

type ArticleLookupResponse = {
  articles?: ArticleOption[]
}

type ArticleSlugFieldProps = {
  field?: {
    label?: string
    required?: boolean
  }
  path?: string
  readOnly?: boolean
}

const baseClass = "article-slug-field"

const normalizeSearch = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const loadArticleOptions = async ({
  currentValue,
  search,
  locale,
  signal,
}: {
  currentValue: string
  locale?: string
  search: string
  signal: AbortSignal
}) => {
  const params = new URLSearchParams({ limit: "20" })
  const query = normalizeSearch(search || currentValue)
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
  return data.articles || []
}

export const ArticleSlugField: React.FC<ArticleSlugFieldProps> = ({
  field,
  path: pathFromProps,
  readOnly,
}) => {
  const { disabled, path, setValue, showError, value } = useField<string>({
    potentiallyStalePath: pathFromProps,
  })
  const locale = useLocale()

  const currentValue = typeof value === "string" ? value : ""
  const [search, setSearch] = useState("")
  const [options, setOptions] = useState<ArticleOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const selectedOption = useMemo(
    () => options.find((option) => option.slug === currentValue),
    [currentValue, options]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const articles = await loadArticleOptions({
          currentValue,
          locale: locale?.code,
          search,
          signal: controller.signal,
        })
        setOptions(articles)
      } catch (caughtError) {
        if ((caughtError as Error).name !== "AbortError") {
          setError((caughtError as Error).message)
          setOptions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [currentValue, locale?.code, search])

  const isDisabled = Boolean(disabled || readOnly)

  const selectedPreview = selectedOption?.thumbnail ? (
    <div className={`${baseClass}__selected`}>
      <span
        aria-hidden="true"
        className={`${baseClass}__thumbnail`}
        style={{ backgroundImage: `url(${selectedOption.thumbnail})` }}
      />
      <span>{selectedOption.slug}</span>
    </div>
  ) : null

  const currentValuePreview =
    !selectedPreview && currentValue ? (
      <div className={`${baseClass}__selected`}>{currentValue}</div>
    ) : null

  return (
    <div
      className={[baseClass, showError && "error"].filter(Boolean).join(" ")}
    >
      <FieldLabel
        label={field?.label || "Article"}
        path={path}
        required={field?.required}
      />
      <div className={`${baseClass}__wrap`}>
        <FieldError path={path} showError={showError} />
        <input
          disabled={isDisabled}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search articles…"
          type="search"
          value={search}
        />
        <select
          disabled={isDisabled || isLoading}
          onChange={(event) => {
            setValue(event.target.value)
          }}
          value={currentValue}
        >
          <option value={currentValue}>
            {selectedOption?.title || currentValue || "Select article…"}
          </option>
          {options.map((option) => (
            <option key={option.id || option.slug} value={option.slug}>
              {option.title} ({option.slug})
            </option>
          ))}
        </select>
        {selectedPreview}
        {currentValuePreview}
        {isLoading ? (
          <div className={`${baseClass}__hint`}>Loading articles…</div>
        ) : null}
        {error ? <div className={`${baseClass}__error`}>{error}</div> : null}
      </div>
      <style jsx>{`
        .${baseClass}__wrap {
          display: grid;
          gap: 0.5rem;
        }
        .${baseClass} input,
        .${baseClass} select {
          background: var(--theme-elevation-50);
          border: 1px solid var(--theme-elevation-150);
          border-radius: 4px;
          color: var(--theme-text);
          min-height: 42px;
          padding: 0 0.75rem;
          width: 100%;
        }
        .${baseClass}__selected {
          align-items: center;
          color: var(--theme-elevation-600);
          display: flex;
          gap: 0.5rem;
          font-size: 0.85rem;
        }
        .${baseClass}__thumbnail {
          background-position: center;
          background-size: cover;
          border-radius: 4px;
          display: block;
          height: 42px;
          width: 42px;
        }
        .${baseClass}__hint {
          color: var(--theme-elevation-500);
          font-size: 0.85rem;
        }
        .${baseClass}__error {
          color: var(--theme-error-500);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  )
}

export default ArticleSlugField
