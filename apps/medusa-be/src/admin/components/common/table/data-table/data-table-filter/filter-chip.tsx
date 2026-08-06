import { XMarkMini } from "@medusajs/icons"
import { clx, Text } from "@medusajs/ui"
import {
  Anchor as PopoverAnchor,
  Trigger as PopoverTrigger,
} from "@radix-ui/react-popover"
import type { MouseEvent } from "react"
import { useTranslation } from "react-i18next"

export interface FilterChipProps {
  hadPreviousValue?: boolean
  label: string
  value?: string
  readonly?: boolean
  hasOperator?: boolean
  onRemove: () => void
}

const FilterChip = ({
  hadPreviousValue,
  label,
  value,
  readonly,
  hasOperator,
  onRemove,
}: FilterChipProps) => {
  const { t } = useTranslation()
  const hasValue = value !== undefined || hadPreviousValue === true
  const isReadonly = readonly === true

  const handleRemove = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onRemove()
  }

  return (
    <div className="flex cursor-default select-none items-stretch overflow-hidden rounded-md bg-ui-bg-field text-ui-fg-subtle shadow-borders-base transition-fg">
      {hadPreviousValue !== true && <PopoverAnchor />}
      <div
        className={clx(
          "flex items-center justify-center whitespace-nowrap px-2 py-1",
          {
            "border-r": hasValue,
          },
        )}
      >
        <Text leading="compact" size="small" weight="plus">
          {label}
        </Text>
      </div>
      <div className="flex w-full items-center overflow-hidden">
        {hasOperator === true && hasValue && (
          <div className="border-r p-1 px-2">
            <Text
              className="text-ui-fg-muted"
              leading="compact"
              size="small"
              weight="plus"
            >
              {t("general.is")}
            </Text>
          </div>
        )}
        {hasValue && (
          <PopoverTrigger
            asChild
            className={clx(
              "flex-1 cursor-pointer overflow-hidden border-r p-1 px-2",
              {
                "data-[state=open]:bg-ui-bg-field-hover": !isReadonly,
                "hover:bg-ui-bg-field-hover": !isReadonly,
              },
            )}
          >
            <Text
              className="truncate text-nowrap"
              leading="compact"
              size="small"
              weight="plus"
            >
              {value ?? "\u00A0"}
            </Text>
          </PopoverTrigger>
        )}
      </div>
      {!isReadonly && hasValue && (
        <button
          className={clx(
            "flex items-center justify-center p-1 text-ui-fg-muted transition-fg",
            "hover:bg-ui-bg-subtle-hover",
            "active:bg-ui-bg-subtle-pressed active:text-ui-fg-base",
          )}
          onClick={handleRemove}
          type="button"
        >
          <XMarkMini />
        </button>
      )}
    </div>
  )
}

export default FilterChip
