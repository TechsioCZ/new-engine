import { z } from "@medusajs/framework/zod"
import { EllipseMiniSolid } from "@medusajs/icons"
import { clx, Input, Label } from "@medusajs/ui"
import {
  Content as PopoverContent,
  Portal as PopoverPortal,
  Root as PopoverRoot,
} from "@radix-ui/react-popover"
import {
  Indicator as RadioGroupIndicator,
  Item as RadioGroupItem,
  Root as RadioGroupRoot,
} from "@radix-ui/react-radio-group"
import { debounce } from "@techsio/std/function"
import type { TFunction } from "i18next"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSelectedParams } from "../hooks"
import { useDataTableFilterContext } from "./context"
import FilterChip from "./filter-chip"
import type { IFilter } from "./types"

const isCancellable = (value: unknown): value is { cancel: () => void } =>
  typeof value === "function" &&
  "cancel" in value &&
  typeof value.cancel === "function"

type NumberFilterProps = IFilter

type Comparison = "exact" | "range"
type Operator = "lt" | "gt" | "eq"

const numberFilterRangeSchema = z
  .object({
    gt: z.union([z.string(), z.number()]).optional(),
    lt: z.union([z.string(), z.number()]).optional(),
  })
  .strict()

type NumberFilterRange = z.infer<typeof numberFilterRangeSchema>
type ParsedNumberFilter = NumberFilterRange | number | undefined

const isComparison = (value: string): value is Comparison =>
  value === "exact" || value === "range"

const joinParams = (value: string[] | null | undefined): string =>
  value?.join(",") ?? ""

const parseParams = (
  value: string[] | null | undefined,
): ParsedNumberFilter => {
  const raw = joinParams(value)

  if (raw === "") {
    return undefined
  }

  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed === "number") {
    return parsed
  }

  const range = numberFilterRangeSchema.safeParse(parsed)
  return range.success ? range.data : undefined
}

const parseParamsOrEmpty = (
  value: string[] | null | undefined,
): Exclude<ParsedNumberFilter, undefined> => parseParams(value) ?? {}

type Bound = NumberFilterRange["gt"]

/** Only non-empty bounds contribute to the chip label. */
const asDisplayBound = (bound: Bound): Bound =>
  bound === undefined || bound === "" || bound === 0 ? undefined : bound

const withoutOperator = (
  range: NumberFilterRange,
  operator: Operator,
): NumberFilterRange => ({
  ...(operator === "gt" || range.gt === undefined ? {} : { gt: range.gt }),
  ...(operator === "lt" || range.lt === undefined ? {} : { lt: range.lt }),
})

const parseDisplayValue = (
  value: string[] | null | undefined,
  t: TFunction,
) => {
  const parsed = parseParamsOrEmpty(value)
  let displayValue = ""

  if (typeof parsed === "object") {
    const parts: string[] = []
    const greaterThan = asDisplayBound(parsed.gt)
    const lessThan = asDisplayBound(parsed.lt)

    if (greaterThan !== undefined) {
      parts.push(t("filters.compare.greaterThanLabel", { value: greaterThan }))
    }

    if (lessThan !== undefined) {
      parts.push(
        t("filters.compare.lessThanLabel", {
          value: lessThan,
        }),
      )
    }

    displayValue = parts.join(` ${t("filters.compare.andLabel")} `)
  }

  if (typeof parsed === "number") {
    displayValue = parsed.toString()
  }

  return displayValue
}

const getValue = (value: string[] | null | undefined, key: Operator): Bound => {
  const parsed = parseParams(value)

  if (typeof parsed === "object") {
    return key === "eq" ? undefined : parsed[key]
  }

  return typeof parsed === "number" && key === "eq" ? parsed : undefined
}

const getOperator = (value?: string[] | null): Comparison | undefined =>
  typeof parseParams(value) === "object" ? "range" : "exact"

export const NumberFilter = ({
  filter,
  prefix,
  readonly,
  openOnMount = false,
}: NumberFilterProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(openOnMount)

  const { key, label } = filter

  const { removeFilter } = useDataTableFilterContext()
  const selectedParams = useSelectedParams({
    param: key,
    ...(prefix === undefined || prefix === "" ? {} : { prefix }),
    multiple: false,
  })

  const currentValue = selectedParams.get()
  const [previousValue, setPreviousValue] = useState<string[] | undefined>(
    currentValue,
  )

  const [operator, setOperator] = useState<Comparison | undefined>(() =>
    getOperator(currentValue),
  )

  const debouncedOnChange = debounce(
    (value: string, selectedOperator: Operator) => {
      const curr = parseParamsOrEmpty(currentValue)
      const isCurrentNumber = !Number.isNaN(Number(curr))

      const handleValue = (valueOperator: Operator) => {
        if (value === "" && isCurrentNumber) {
          selectedParams.delete()
          return
        }

        if (value === "" && typeof curr === "object") {
          selectedParams.add(
            JSON.stringify(withoutOperator(curr, valueOperator)),
          )
          return
        }

        selectedParams.add(
          JSON.stringify({
            ...(typeof curr === "object" ? curr : {}),
            [valueOperator]: value,
          }),
        )
      }

      switch (selectedOperator) {
        case "eq": {
          if (value === "") {
            selectedParams.delete()
          } else {
            selectedParams.add(value)
          }
          break
        }
        case "lt":
        case "gt": {
          handleValue(selectedOperator)
          break
        }
        default: {
          break
        }
      }
    },
    500,
  )

  useEffect(
    () => () => {
      if (isCancellable(debouncedOnChange)) {
        debouncedOnChange.cancel()
      }
    },
    [debouncedOnChange],
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    setPreviousValue(currentValue)

    if (!(nextOpen || currentValue.length)) {
      setTimeout(() => {
        removeFilter(key)
      }, 200)
    }
  }

  const handleRemove = () => {
    selectedParams.delete()
    removeFilter(key)
  }

  const operators: { operator: Comparison; label: string }[] = [
    {
      label: t("filters.compare.exact"),
      operator: "exact",
    },
    {
      label: t("filters.compare.range"),
      operator: "range",
    },
  ]

  const GT_KEY = `${key}-gt`
  const LT_KEY = `${key}-lt`
  const EQ_KEY = key

  const displayValue = parseDisplayValue(currentValue, t)
  const previousDisplayValue = parseDisplayValue(previousValue, t)

  return (
    <PopoverRoot modal onOpenChange={handleOpenChange} open={open}>
      <FilterChip
        hadPreviousValue={!!previousDisplayValue}
        hasOperator
        label={label}
        onRemove={handleRemove}
        readonly={readonly ?? false}
        value={displayValue}
      />
      {readonly !== true && (
        <PopoverPortal>
          <PopoverContent
            align="start"
            className={clx(
              "max-h-[var(--radix-popper-available-height)] w-[300px] divide-y overflow-y-auto rounded-lg bg-ui-bg-base text-ui-fg-base shadow-elevation-flyout outline-none",
            )}
            collisionPadding={24}
            data-name="number_filter_content"
            onInteractOutside={(e) => {
              if (
                e.target instanceof HTMLElement &&
                e.target.attributes.getNamedItem("data-name")?.value ===
                  "filters_menu_content"
              ) {
                e.preventDefault()
              }
            }}
            sideOffset={8}
          >
            <div className="p-1">
              <RadioGroupRoot
                autoFocus
                className="flex flex-col items-start"
                onValueChange={(val) => {
                  if (isComparison(val)) {
                    setOperator(val)
                  }
                }}
                orientation="vertical"
                value={operator ?? null}
              >
                {operators.map((o) => (
                  <RadioGroupItem
                    className="txt-compact-small grid w-full grid-cols-[20px_1fr] gap-2 rounded-[4px] px-2 py-1.5 text-left outline-none transition-fg hover:bg-ui-bg-base-hover focus-visible:bg-ui-bg-base-hover active:bg-ui-bg-base-pressed"
                    key={o.operator}
                    value={o.operator}
                  >
                    <div className="size-5">
                      <RadioGroupIndicator>
                        <EllipseMiniSolid />
                      </RadioGroupIndicator>
                    </div>
                    <span className="w-full">{o.label}</span>
                  </RadioGroupItem>
                ))}
              </RadioGroupRoot>
            </div>
            <div>
              {operator === "range" ? (
                <div className="px-1 pt-1 pb-3" key="range">
                  <div className="px-2 py-1.5">
                    <Label htmlFor={GT_KEY} size="xsmall" weight="plus">
                      {t("filters.compare.greaterThan")}
                    </Label>
                  </div>
                  <div className="px-2 py-0.5">
                    <Input
                      defaultValue={getValue(currentValue, "gt")}
                      name={GT_KEY}
                      onChange={(event) => {
                        debouncedOnChange(event.target.value, "gt")
                      }}
                      size="small"
                      type="number"
                    />
                  </div>
                  <div className="px-2 py-1.5">
                    <Label htmlFor={LT_KEY} size="xsmall" weight="plus">
                      {t("filters.compare.lessThan")}
                    </Label>
                  </div>
                  <div className="px-2 py-0.5">
                    <Input
                      defaultValue={getValue(currentValue, "lt")}
                      name={LT_KEY}
                      onChange={(event) => {
                        debouncedOnChange(event.target.value, "lt")
                      }}
                      size="small"
                      type="number"
                    />
                  </div>
                </div>
              ) : (
                <div className="px-1 pt-1 pb-3" key="exact">
                  <div className="px-2 py-1.5">
                    <Label htmlFor={EQ_KEY} size="xsmall" weight="plus">
                      {label}
                    </Label>
                  </div>
                  <div className="px-2 py-0.5">
                    <Input
                      defaultValue={getValue(currentValue, "eq")}
                      name={EQ_KEY}
                      onChange={(event) => {
                        debouncedOnChange(event.target.value, "eq")
                      }}
                      size="small"
                      type="number"
                    />
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </PopoverPortal>
      )}
    </PopoverRoot>
  )
}
