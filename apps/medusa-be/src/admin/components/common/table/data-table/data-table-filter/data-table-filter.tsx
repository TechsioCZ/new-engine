import { Button, clx } from "@medusajs/ui"
import {
  Content as PopoverContent,
  Portal as PopoverPortal,
  Root as PopoverRoot,
  Trigger as PopoverTrigger,
} from "@radix-ui/react-popover"
import { useReducer, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { DataTableFilterContext, useDataTableFilterContext } from "./context"
import { NumberFilter } from "./number-filter"
import { SelectFilter } from "./select-filter"
import { StringFilter } from "./string-filter"

interface Option {
  label: string
  value: unknown
}

interface ScalarFilterTypes {
  date: true
  number: true
  string: true
}

interface FilterBase {
  key: string
  label: string
}

export type Filter = FilterBase &
  (
    | {
        multiple?: boolean
        options: Option[]
        searchable?: boolean
        type: "select"
      }
    | {
        options?: never
        type: keyof ScalarFilterTypes
      }
  )

interface DataTableFilterProps {
  filters: Filter[]
  readonly?: boolean
  prefix?: string
}

interface ClearAllFiltersProps {
  filters: Filter[]
  prefix?: string
}

const ClearAllFilters = ({ filters, prefix }: ClearAllFiltersProps) => {
  const { t } = useTranslation()
  const { removeAllFilters } = useDataTableFilterContext()
  const [, setSearchParams] = useSearchParams()

  const handleRemoveAll = () => {
    setSearchParams((prev) => {
      const newValues = new URLSearchParams(prev)

      for (const filter of filters) {
        newValues.delete(
          prefix === undefined || prefix.length === 0
            ? filter.key
            : `${prefix}_${filter.key}`,
        )
      }

      return newValues
    })

    removeAllFilters()
  }

  return (
    <button
      className={clx(
        "txt-compact-small-plus rounded-md px-2 py-1 text-ui-fg-muted transition-fg",
        "hover:text-ui-fg-subtle",
        "focus-visible:shadow-borders-focus",
      )}
      onClick={handleRemoveAll}
      type="button"
    >
      {t("filters.clearAll")}
    </button>
  )
}

const getInitialFilters = ({
  searchParams,
  filters,
  prefix,
}: {
  searchParams: URLSearchParams
  filters: Filter[]
  prefix?: string
}) => {
  const params = new URLSearchParams(searchParams)
  const activeFilters: (Filter & { openOnMount: boolean })[] = []

  for (const filter of filters) {
    const key =
      prefix === undefined || prefix.length === 0
        ? filter.key
        : `${prefix}_${filter.key}`
    const value = params.get(key)
    if (value !== null && value.length > 0) {
      if (filter.type === "select") {
        activeFilters.push({
          ...filter,
          openOnMount: false,
          options: filter.options,
        })
      } else {
        activeFilters.push({ ...filter, openOnMount: false })
      }
    }
  }

  return activeFilters
}

type ActiveFilter = Filter & { openOnMount: boolean }

const removeFilterByKey = (activeFilters: ActiveFilter[], key: string) =>
  activeFilters.filter((filter) => filter.key !== key)

const createFilterContextValue = (
  setActiveFilters: Dispatch<SetStateAction<ActiveFilter[]>>,
) => ({
  removeAllFilters: () => {
    setActiveFilters([])
  },
  removeFilter: (key: string) => {
    setActiveFilters((prev) => removeFilterByKey(prev, key))
  },
})

const keepFilterContextValue = <T,>(value: T) => value

export const DataTableFilter = ({
  filters,
  readonly,
  prefix,
}: DataTableFilterProps) => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [open, setOpen] = useState(false)

  const [activeFilters, setActiveFilters] = useState(() =>
    getInitialFilters({
      filters,
      searchParams,
      ...(prefix === undefined || prefix.length === 0 ? {} : { prefix }),
    }),
  )

  const availableFilters = filters.filter(
    (f) => !activeFilters.some((af) => af.key === f.key),
  )

  const addFilter = (filter: Filter) => {
    setOpen(false)
    setActiveFilters((prev) => [...prev, { ...filter, openOnMount: true }])
  }

  const [contextValue] = useReducer(
    keepFilterContextValue,
    setActiveFilters,
    createFilterContextValue,
  )

  return (
    <DataTableFilterContext.Provider value={contextValue}>
      <div className="flex max-w-2/3 flex-wrap items-center gap-2">
        {activeFilters.map((filter) => {
          switch (filter.type) {
            case "select": {
              return (
                <SelectFilter
                  filter={filter}
                  key={filter.key}
                  {...(filter.multiple === undefined
                    ? {}
                    : { multiple: filter.multiple })}
                  openOnMount={filter.openOnMount}
                  options={filter.options}
                  {...(prefix === undefined || prefix.length === 0
                    ? {}
                    : { prefix })}
                  {...(readonly === undefined ? {} : { readonly })}
                  {...(filter.searchable === undefined
                    ? {}
                    : { searchable: filter.searchable })}
                />
              )
            }
            case "string": {
              return (
                <StringFilter
                  filter={filter}
                  key={filter.key}
                  openOnMount={filter.openOnMount}
                  {...(prefix === undefined || prefix.length === 0
                    ? {}
                    : { prefix })}
                  {...(readonly === undefined ? {} : { readonly })}
                />
              )
            }
            case "number": {
              return (
                <NumberFilter
                  filter={filter}
                  key={filter.key}
                  openOnMount={filter.openOnMount}
                  {...(prefix === undefined || prefix.length === 0
                    ? {}
                    : { prefix })}
                  {...(readonly === undefined ? {} : { readonly })}
                />
              )
            }
            case "date": {
              return null
            }
            default: {
              return null
            }
          }
        })}
        {readonly !== true && availableFilters.length > 0 && (
          <PopoverRoot modal onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild id="filters_menu_trigger">
              <Button size="small" variant="secondary">
                {t("filters.addFilter")}
              </Button>
            </PopoverTrigger>
            <PopoverPortal>
              <PopoverContent
                align="start"
                className={clx(
                  "z-[1] h-full max-h-[200px] w-[300px] overflow-auto rounded-lg bg-ui-bg-base p-1 text-ui-fg-base shadow-elevation-flyout outline-none",
                )}
                collisionPadding={8}
                data-name="filters_menu_content"
                onCloseAutoFocus={(e) => {
                  const hasOpenFilter = activeFilters.some(
                    (filter) => filter.openOnMount,
                  )

                  if (hasOpenFilter) {
                    e.preventDefault()
                  }
                }}
                sideOffset={8}
              >
                {availableFilters.map((filter) => (
                  <button
                    className="txt-compact-small relative flex w-full cursor-pointer select-none items-center rounded-md bg-ui-bg-base px-2 py-1.5 text-left text-ui-fg-base outline-none transition-colors hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-pressed data-[disabled]:pointer-events-none data-[disabled]:text-ui-fg-disabled"
                    key={filter.key}
                    onClick={() => {
                      addFilter(filter)
                    }}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </PopoverContent>
            </PopoverPortal>
          </PopoverRoot>
        )}
        {readonly !== true && activeFilters.length > 0 && (
          <ClearAllFilters
            filters={filters}
            {...(prefix === undefined || prefix.length === 0 ? {} : { prefix })}
          />
        )}
      </div>
    </DataTableFilterContext.Provider>
  )
}
