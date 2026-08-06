import { clx, Input, Label } from "@medusajs/ui"
import {
  Content as PopoverContent,
  Portal as PopoverPortal,
  Root as PopoverRoot,
} from "@radix-ui/react-popover"
import { useEffect, useRef, useState } from "react"

import { debounce } from "../../../../../utils/debounce"
import { useSelectedParams } from "../hooks"
import { useDataTableFilterContext } from "./context"
import FilterChip from "./filter-chip"
import type { IFilter } from "./types"

type StringFilterProps = IFilter

export const StringFilter = ({
  filter,
  prefix,
  readonly,
  openOnMount,
}: StringFilterProps) => {
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { key, label } = filter

  const { removeFilter } = useDataTableFilterContext()
  const selectedParams = useSelectedParams({
    param: key,
    ...(prefix === undefined || prefix === "" ? {} : { prefix }),
  })

  const query = selectedParams.get()

  const [previousValue, setPreviousValue] = useState<string | undefined>(
    query?.[0],
  )

  const debouncedOnChange = debounce((value: string) => {
    if (value.length > 0) {
      selectedParams.add(value)
    } else {
      selectedParams.delete()
    }
  }, 500)

  useEffect(
    () => () => {
      debouncedOnChange.cancel()
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current)
      }
    },
    [debouncedOnChange],
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setPreviousValue(query?.[0])

    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current)
    }

    if (!nextOpen && query.length === 0) {
      timeoutIdRef.current = setTimeout(() => {
        removeFilter(key)
      }, 200)
    }
  }

  const handleRemove = () => {
    selectedParams.delete()
    removeFilter(key)
  }

  return (
    <PopoverRoot
      defaultOpen={openOnMount === true}
      modal
      onOpenChange={handleOpenChange}
    >
      <FilterChip
        hadPreviousValue={
          previousValue !== undefined && previousValue.length > 0
        }
        hasOperator
        label={label}
        onRemove={handleRemove}
        readonly={readonly ?? false}
        value={query?.[0] ?? ""}
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
            <div className="px-1 pt-1 pb-3">
              <div className="px-2 py-1.5">
                <Label htmlFor={key} size="xsmall" weight="plus">
                  {label}
                </Label>
              </div>
              <div className="px-2 py-0.5">
                <Input
                  defaultValue={query[0] ?? undefined}
                  name={key}
                  onChange={(event) => {
                    debouncedOnChange(event.target.value)
                  }}
                  size="small"
                />
              </div>
            </div>
          </PopoverContent>
        </PopoverPortal>
      )}
    </PopoverRoot>
  )
}
