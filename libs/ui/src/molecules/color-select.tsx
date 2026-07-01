import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
import { tv } from "../utils"

const colorSelectVariants = tv({
  slots: {
    group: ["grid place-items-start"],
    cell: "grid",
    atom: [
      "relative cursor-pointer p-color-select-atom",
      "aspect-square overflow-hidden",
      "border-2 transition-all duration-200",
      "border-color-select-border shadow-color-select hover:border-color-select-border-hover",
      "focus-visible:outline-none",
      "focus-visible:ring",
      "focus-visible:ring-color-select-ring",
      "data-[selected=true]:border-color-select-selected data-[selected=true]:shadow-none",
    ],
    color: [
      "absolute",
      "h-full w-full hover:brightness-75",
      "data-[selected=true]:brightness-75",
    ],
    icon: [
      "absolute hidden items-center justify-center",
      "text-color-select-fg-check drop-shadow-sm",
      "pointer-events-none",
      "data-[selected=true]:flex",
    ],
    labelContainer: ["text-center"],
    labelText: ["text-color-select-label-fg text-xs"],
    countText: ["text-color-select-label-fg text-xs"],
  },
  variants: {
    radius: {
      sm: {
        atom: "rounded-color-select-sm",
      },
      md: {
        atom: "rounded-color-select-md",
      },
      lg: {
        atom: "rounded-color-select-lg",
      },
      full: {
        atom: "rounded-color-select-full",
      },
    },
    size: {
      sm: {
        group: "gap-color-select-group-sm",
        atom: "h-color-select-sm",
        icon: "text-color-select-sm",
      },
      md: {
        group: "gap-color-select-group-md",
        atom: "h-color-select-md",
        icon: "text-color-select-md",
      },
      lg: {
        group: "gap-color-select-group-lg",
        atom: "h-color-select-lg",
        icon: "text-color-select-lg",
      },
      full: {
        group: "h-full",
        cell: "h-full",
        atom: "h-full",
        icon: "h-color-select-icon w-color-select-icon",
      },
    },
    layout: {
      list: {
        group: "grid-cols-1",
      },
      grid: {
        group: "color-select-grid",
      },
    },
    disabled: {
      true: {
        atom: "select-disabled hover:border-color-select-border",
      },
    },
  },
  defaultVariants: {
    radius: "full",
    size: "lg",
    layout: "list",
  },
})

export interface ColorItem {
  id?: string
  color: string
  selected?: boolean
  label?: string
  count?: number
  disabled?: boolean
}

interface ColorSelectProps {
  colors: ColorItem[]
  layout?: "list" | "grid"
  size?: "sm" | "md" | "lg" | "full"
  radius?: "sm" | "md" | "lg" | "full"
  disabled?: boolean
  onColorClick?: (color: string) => void
  selectionMode?: "single" | "multiple"
}

export const ColorSelect = ({
  colors,
  layout = "grid",
  size = "lg",
  radius = "full",
  disabled,
  onColorClick,
  selectionMode = "single",
}: ColorSelectProps) => {
  const {
    group,
    cell,
    atom,
    color: colorSlot,
    icon,
    labelContainer,
    labelText,
    countText,
  } = colorSelectVariants({ layout, size, radius, disabled })
  return (
    <div
      className={group()}
      role={selectionMode === "single" ? "radiogroup" : "group"}
    >
      {colors.map((colorItem) => (
        <div className={cell()} key={colorItem.id || colorItem.color}>
          <Button
            aria-checked={!!colorItem.selected}
            aria-label={`Select color ${colorItem.label ?? colorItem.color}`}
            className={`${atom()} ${colorItem.disabled ? "select-disabled" : ""}`}
            data-selected={colorItem.selected}
            disabled={colorItem.disabled || disabled}
            onClick={() => onColorClick?.(colorItem.color)}
            role={selectionMode === "single" ? "radio" : "checkbox"}
            theme="borderless"
          >
            <span
              aria-hidden="true"
              className={colorSlot()}
              data-selected={colorItem.selected}
              style={{ backgroundColor: colorItem.color }}
            />
            <Icon
              className={icon()}
              data-selected={colorItem.selected}
              icon="token-icon-color-select"
            />
          </Button>
          {(colorItem.label != null || colorItem.count != null) && (
            <div className={labelContainer()}>
              {colorItem.label && (
                <span className={labelText()}>{colorItem.label}</span>
              )}
              {colorItem.count != null && (
                <span className={countText()}>({colorItem.count})</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
