import { CheckMini, EllipseMiniSolid, XMarkMini } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import {
  Content as PopoverContent,
  Portal as PopoverPortal,
  Root as PopoverRoot,
} from "@radix-ui/react-popover"
import { Command } from "cmdk"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSelectedParams } from "../hooks"
import { useDataTableFilterContext } from "./context"
import FilterChip from "./filter-chip"
import type { IFilter } from "./types"

type SelectFilterProps = IFilter & {
  options: { label: string; value: unknown }[]
  readonly?: boolean
  multiple?: boolean
  searchable?: boolean
}

const normalizeValue = (value?: string | string[]) => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  return Array.isArray(value) ? value : [value]
}

export const SelectFilter = ({
  filter,
  prefix,
  readonly,
  multiple,
  searchable,
  options,
  openOnMount,
}: SelectFilterProps) => {
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { t } = useTranslation()
  const { removeFilter } = useDataTableFilterContext()

  const { key, label } = filter
  const selectedParams = useSelectedParams({
    param: key,
    ...(prefix === undefined ? {} : { prefix }),
    ...(multiple === undefined ? {} : { multiple }),
  })
  const currentValue = selectedParams.get()

  const labelValues = currentValue.flatMap((value) => {
    const optionLabel = options.find((option) => option.value === value)?.label
    return optionLabel === undefined ? [] : [optionLabel]
  })

  const [previousValue, setPreviousValue] = useState<
    string | string[] | undefined
  >(labelValues)

  const handleRemove = () => {
    selectedParams.delete()
    removeFilter(key)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setPreviousValue(labelValues)

    if (timeoutId.current !== null) {
      clearTimeout(timeoutId.current)
    }

    if (!(nextOpen || currentValue.length)) {
      timeoutId.current = setTimeout(() => {
        removeFilter(key)
      }, 200)
    }
  }

  const handleClearSearch = () => {
    setSearch("")

    searchRef.current?.focus()
  }

  const handleSelect = (value: unknown) => {
    const isSelected = selectedParams.get().includes(String(value))

    if (isSelected) {
      selectedParams.delete(String(value))
    } else {
      selectedParams.add(String(value))
    }
  }

  const normalizedValues = labelValues.length > 0 ? labelValues : null
  const normalizedPrev = normalizeValue(previousValue)
  const selectedValueSet = new Set(selectedParams.get())

  return (
    <PopoverRoot
      {...(openOnMount === undefined ? {} : { defaultOpen: openOnMount })}
      modal
      onOpenChange={handleOpenChange}
    >
      <FilterChip
        hadPreviousValue={(normalizedPrev?.length ?? 0) > 0}
        hasOperator
        label={label}
        onRemove={handleRemove}
        readonly={readonly ?? false}
        value={normalizedValues?.join(", ") ?? ""}
      />
      {readonly !== true && (
        <PopoverPortal>
          <PopoverContent
            align="start"
            className={clx(
              "z-[1] h-full max-h-[200px] w-[300px] overflow-hidden rounded-lg bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout outline-none",
            )}
            collisionPadding={8}
            hideWhenDetached
            onInteractOutside={(e) => {
              if (
                e.target instanceof HTMLElement &&
                e.target.attributes.getNamedItem("data-name")?.value ===
                  "filters_menu_content"
              ) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
            sideOffset={8}
          >
            <Command className="h-full">
              {searchable === true && (
                <div className="border-b p-1">
                  <div className="grid grid-cols-[1fr_20px] gap-x-2 rounded-md px-2 py-1">
                    <Command.Input
                      className="txt-compact-small bg-transparent outline-none placeholder:text-ui-fg-muted"
                      onValueChange={setSearch}
                      placeholder={t("filters.search")}
                      ref={searchRef}
                      value={search}
                    />
                    <div className="flex h-5 w-5 items-center justify-center">
                      <button
                        className={clx(
                          "rounded-md text-ui-fg-muted outline-none transition-fg focus-visible:bg-ui-bg-base-pressed",
                          {
                            invisible: search.length === 0,
                          },
                        )}
                        disabled={search.length === 0}
                        onClick={handleClearSearch}
                        type="button"
                      >
                        <XMarkMini />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <Command.Empty className="txt-compact-small flex items-center justify-center p-1">
                <span className="w-full px-2 py-1 text-center">
                  {t("general.noResultsTitle")}
                </span>
              </Command.Empty>
              <Command.List className="h-full max-h-[163px] min-h-[0] overflow-auto p-1 outline-none">
                {options.map((option) => {
                  const isSelected = selectedValueSet.has(String(option.value))

                  return (
                    <Command.Item
                      className="txt-compact-small relative flex cursor-pointer select-none items-center gap-x-2 rounded-md bg-ui-bg-base px-2 py-1.5 text-ui-fg-base outline-none transition-colors hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-pressed aria-selected:bg-ui-bg-base-pressed data-[disabled]:pointer-events-none data-[disabled]:text-ui-fg-disabled"
                      key={String(option.value)}
                      onSelect={() => {
                        handleSelect(option.value)
                      }}
                      value={option.label}
                    >
                      <div
                        className={clx(
                          "flex h-5 w-5 items-center justify-center transition-fg",
                          {
                            "[&_svg]:invisible": !isSelected,
                          },
                        )}
                      >
                        {multiple === true ? (
                          <CheckMini />
                        ) : (
                          <EllipseMiniSolid />
                        )}
                      </div>
                      {option.label}
                    </Command.Item>
                  )
                })}
              </Command.List>
            </Command>
          </PopoverContent>
        </PopoverPortal>
      )}
    </PopoverRoot>
  )
}
