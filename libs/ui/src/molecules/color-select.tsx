/**
 * ColorSelect — @techsio/ui-kit molecule.
 *
 * @component ColorSelect
 * @componentVersion v1.0.0
 * @skill color-select-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the color-select-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
import { tv } from "../utils"

const colorSelectVariants = tv({
  defaultVariants: {
    layout: "list",
    radius: "full",
    size: "lg",
  },
  slots: {
    atom: [
      "relative cursor-pointer p-color-select-atom",
      "aspect-square overflow-hidden",
      "border-2 transition-all duration-200 motion-reduce:transition-none",
      "border-color-select-border shadow-color-select hover:border-color-select-border-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-color-select-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-[selected=true]:border-color-select-border-selected data-[selected=true]:shadow-none",
    ],
    cell: "grid",
    color: [
      "absolute",
      "hover:brightness-75 size-full",
      "data-[selected=true]:brightness-75",
    ],
    countText: ["text-color-select-label-fg text-xs"],
    group: ["grid place-items-start"],
    icon: [
      "absolute hidden items-center justify-center",
      "text-color-select-fg-check drop-shadow-sm",
      "pointer-events-none",
      "data-[selected=true]:flex",
    ],
    labelContainer: ["text-center"],
    labelText: ["text-color-select-label-fg text-xs"],
  },
  variants: {
    disabled: {
      true: {
        atom: "select-disabled hover:border-color-select-border",
      },
    },
    layout: {
      grid: {
        group: "color-select-grid",
      },
      list: {
        group: "grid-cols-1",
      },
    },
    radius: {
      full: {
        atom: "rounded-color-select-full",
      },
      lg: {
        atom: "rounded-color-select-lg",
      },
      md: {
        atom: "rounded-color-select-md",
      },
      sm: {
        atom: "rounded-color-select-sm",
      },
    },
    size: {
      full: {
        atom: "h-full",
        cell: "size-full",
        group: "gap-color-select-md size-full",
        icon: "size-color-select-icon",
      },
      lg: {
        atom: "h-color-select-lg",
        group: "gap-color-select-lg",
        icon: "text-icon-color-select-lg",
      },
      md: {
        atom: "h-color-select-md",
        group: "gap-color-select-md",
        icon: "text-icon-color-select-md",
      },
      sm: {
        atom: "h-color-select-sm",
        group: "gap-color-select-sm",
        icon: "text-icon-color-select-sm",
      },
    },
  },
})

export interface ColorItem {
  id?: string | undefined
  color: string
  selected?: boolean | undefined
  label?: string | undefined
  count?: number | undefined
  disabled?: boolean | undefined
}

interface ColorSelectProps {
  colors: ColorItem[]
  layout?: "list" | "grid" | undefined
  size?: "sm" | "md" | "lg" | "full" | undefined
  radius?: "sm" | "md" | "lg" | "full" | undefined
  disabled?: boolean | undefined
  onColorClick?: ((color: string) => void) | undefined
  selectionMode?: "single" | "multiple" | undefined
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
  } = colorSelectVariants({ disabled, layout, radius, size })
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
