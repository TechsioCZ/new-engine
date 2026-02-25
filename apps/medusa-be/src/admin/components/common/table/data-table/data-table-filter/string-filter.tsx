import { clx, Input, Label } from "@medusajs/ui"
import * as Popover from "@radix-ui/react-popover"
import { debounce } from "lodash"
import { type ChangeEvent, useCallback, useEffect, useState } from "react"
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
  const [open, setOpen] = useState(openOnMount)

  const { key, label } = filter

  const { removeFilter } = useDataTableFilterContext()
  const selectedParams = useSelectedParams({ param: key, prefix })

  const query = selectedParams.get()

  const [previousValue, setPreviousValue] = useState<string | undefined>(
    query?.[0]
  )

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedOnChange = useCallback(
    debounce((e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

      if (value) {
        selectedParams.add(value)
      } else {
        selectedParams.delete()
      }
    }, 500),
    [selectedParams]
  )

  useEffect(
    () => () => {
      debouncedOnChange.cancel()
    },
    [debouncedOnChange]
  )

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const handleOpenChange = (open: boolean) => {
    setOpen(open)
    setPreviousValue(query?.[0])

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    if (!(open || query.length)) {
      timeoutId = setTimeout(() => {
        removeFilter(key)
      }, 200)
    }
  }

  const handleRemove = () => {
    selectedParams.delete()
    removeFilter(key)
  }

  return (
    <Popover.Root modal onOpenChange={handleOpenChange} open={open}>
      <FilterChip
        hadPreviousValue={!!previousValue}
        hasOperator
        label={label}
        onRemove={handleRemove}
        readonly={readonly}
        value={query?.[0]}
      />
      {!readonly && (
        <Popover.Portal>
          <Popover.Content
            align="start"
            className={clx(
              "z-[1] h-full max-h-[200px] w-[300px] overflow-hidden rounded-lg bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout outline-none"
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
                  defaultValue={query?.[0] || undefined}
                  name={key}
                  onChange={debouncedOnChange}
                  size="small"
                />
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  )
}
