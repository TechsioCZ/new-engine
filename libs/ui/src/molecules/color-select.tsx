/**
 * ColorSelect — @techsio/ui-kit molecule.
 *
 * @component ColorSelect
 * @componentVersion v1.1.2
 * @skill color-select-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the color-select-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  useId,
  useMemo,
  useState,
} from "react"
import { Icon } from "../atoms/icon"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { useChoiceFocusRecovery } from "../internal/choice-control"
import { joinDescribedBy } from "../internal/described-by"
import { useEffectiveDisabled } from "../internal/use-effective-disabled"
import { tv } from "../utils"

const colorSelectVariants = tv({
  slots: {
    root: "grid gap-color-select-md",
    group: [
      "form-control-readonly grid min-w-0 items-start justify-items-stretch",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-offset-(length:--default-ring-offset) focus-visible:outline-color-select-ring",
    ],
    cell: "grid w-full min-w-0 justify-items-center",
    atom: [
      "form-control-readonly form-control-disabled relative cursor-pointer p-color-select-atom",
      "disabled:cursor-not-allowed",
      "aspect-square min-w-0 overflow-clip",
      "border-2 transition duration-200 motion-reduce:transition-none",
      "border-color-select-border shadow-color-select hover:border-color-select-border-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-color-select-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-[selected=true]:border-color-select-border-selected data-[selected=true]:shadow-none",
    ],
    color: ["absolute inset-0", "size-full forced-color-adjust-none"],
    icon: [
      "absolute inset-0 hidden size-full items-center justify-center",
      "text-color-select-fg-check drop-shadow-sm",
      "pointer-events-none",
      "data-[selected=true]:flex",
    ],
    checkBadge:
      "flex size-color-select-check items-center justify-center rounded-full bg-color-select-check-bg text-color-select-check-fg",
    labelContainer: ["wrap-anywhere w-full min-w-0 max-w-full text-center"],
    labelText: ["block text-color-select-label-fg"],
    countText: ["block text-color-select-label-fg"],
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
        group: "gap-color-select-sm",
        atom: "h-form-control-sm w-color-select-control-sm",
        icon: "text-(length:--text-color-select-sm)",
        labelText: "text-(length:--text-color-select-sm)",
        countText: "text-(length:--text-color-select-sm)",
      },
      md: {
        group: "gap-color-select-md",
        atom: "h-form-control-md w-color-select-control-md",
        icon: "text-(length:--text-color-select-md)",
        labelText: "text-(length:--text-color-select-md)",
        countText: "text-(length:--text-color-select-md)",
      },
      lg: {
        group: "gap-color-select-lg",
        atom: "h-form-control-lg w-color-select-control-lg",
        icon: "text-(length:--text-color-select-lg)",
        labelText: "text-(length:--text-color-select-lg)",
        countText: "text-(length:--text-color-select-lg)",
      },
      full: {
        group: "size-full gap-color-select-md",
        cell: "size-full",
        atom: "h-full",
        icon: "size-color-select-icon",
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
    size: "md",
    layout: "list",
  },
})

export type ColorItem = {
  id?: string
  color: string
  selected?: boolean
  label?: string
  count?: number
  disabled?: boolean
}

export type ColorSelectProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "onChange"
> & {
  label?: string
  name?: string
  readOnly?: boolean
  helpText?: string
  validateStatus?: "default" | "error" | "warning" | "success"
  colors: ColorItem[]
  layout?: "list" | "grid"
  size?: "sm" | "md" | "lg" | "full"
  radius?: "sm" | "md" | "lg" | "full"
  disabled?: boolean
  onColorClick?: (color: string) => void
  selectionMode?: "single" | "multiple"
}

const navigationKeys = new Set([
  "ArrowRight",
  "ArrowDown",
  "ArrowLeft",
  "ArrowUp",
  "Home",
  "End",
])

function getNextIndex(
  key: string,
  current: number,
  count: number,
  rtl: boolean
) {
  if (key === "Home") {
    return 0
  }
  if (key === "End") {
    return count - 1
  }
  const forward =
    key === "ArrowDown" || key === (rtl ? "ArrowLeft" : "ArrowRight")
  return (current + (forward ? 1 : -1) + count) % count
}

export const ColorSelect = ({
  colors,
  layout = "grid",
  size = "md",
  radius = "full",
  disabled: explicitDisabled,
  onColorClick,
  selectionMode = "single",
  label = "Color",
  name,
  readOnly = false,
  helpText,
  validateStatus = "default",
  ...props
}: ColorSelectProps) => {
  const id = useId()
  const recoveryRef = useChoiceFocusRecovery(
    'button[role="radio"], button[role="checkbox"]'
  )
  const [groupElement, setGroupElement] = useState<HTMLDivElement | null>(null)
  const groupRef = useMemo(
    () => (node: HTMLDivElement | null) => {
      recoveryRef.current = node
      setGroupElement(node)
    },
    [recoveryRef]
  )
  const disabled = useEffectiveDisabled(groupElement, explicitDisabled)
  const immutable = readOnly && !disabled
  const controlSize = size === "full" ? "md" : size
  const messageId = `${id}-status`
  const readOnlyId = `${id}-readonly`
  const [focusedColor, setFocusedColor] = useState<string>()
  const enabledColors = colors.filter((item) => !item.disabled)
  const tabStop =
    enabledColors.find((item) => item.color === focusedColor) ??
    enabledColors.find((item) => item.selected) ??
    enabledColors[0]
  const describedBy = joinDescribedBy(
    props["aria-describedby"],
    helpText ? messageId : undefined,
    immutable ? readOnlyId : undefined
  )
  const {
    root,
    group,
    cell,
    atom,
    color: colorSlot,
    icon,
    checkBadge,
    labelContainer,
    labelText,
    countText,
  } = colorSelectVariants({ layout, size, radius, disabled })
  const checkboxReadOnly =
    (selectionMode === "multiple" && immutable) || undefined
  const invalid = validateStatus === "error"
  const errorMessageId = helpText && invalid ? messageId : undefined
  const selectColor = (item: ColorItem) => {
    if (!(readOnly || disabled || item.disabled)) {
      onColorClick?.(item.color)
    }
  }
  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    item: ColorItem
  ) => {
    if (
      readOnly ||
      disabled ||
      selectionMode !== "single" ||
      !navigationKeys.has(event.key)
    ) {
      return
    }
    event.preventDefault()
    const index = getNextIndex(
      event.key,
      enabledColors.indexOf(item),
      enabledColors.length,
      getComputedStyle(event.currentTarget).direction === "rtl"
    )
    const next = enabledColors[index]
    if (!next) {
      return
    }
    setFocusedColor(next.color)
    const buttons = event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
    buttons?.[index]?.focus()
    onColorClick?.(next.color)
  }
  return (
    <div className={root()}>
      {label && (
        <Label id={`${id}-label`} size={controlSize}>
          {label}
        </Label>
      )}
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: Both conditional group roles support names. */}
      <div
        {...props}
        aria-describedby={describedBy}
        aria-label={props["aria-label"]}
        aria-labelledby={
          props["aria-labelledby"] ??
          (props["aria-label"] || !label ? undefined : `${id}-label`)
        }
        aria-readonly={(selectionMode === "single" && immutable) || undefined}
        className={group({ className: props.className })}
        data-disabled={disabled ? "" : undefined}
        data-readonly={readOnly ? "" : undefined}
        ref={groupRef}
        role={selectionMode === "single" ? "radiogroup" : "group"}
        tabIndex={-1}
      >
        {colors.map((colorItem) => (
          <div className={cell()} key={colorItem.id || colorItem.color}>
            {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: Both radio and checkbox roles support aria-checked. */}
            <button
              aria-checked={!!colorItem.selected}
              aria-describedby={describedBy}
              aria-errormessage={errorMessageId}
              aria-invalid={invalid || undefined}
              aria-label={`Select color ${colorItem.label ?? colorItem.color}`}
              aria-readonly={checkboxReadOnly}
              className={`${atom()} ${colorItem.disabled ? "select-disabled" : ""}`}
              data-readonly={readOnly ? "" : undefined}
              data-selected={colorItem.selected}
              disabled={colorItem.disabled || disabled}
              onClick={() => selectColor(colorItem)}
              onFocus={() => setFocusedColor(colorItem.color)}
              onKeyDown={(event) => handleKeyDown(event, colorItem)}
              role={selectionMode === "single" ? "radio" : "checkbox"}
              tabIndex={
                selectionMode === "single" && tabStop?.color !== colorItem.color
                  ? -1
                  : 0
              }
              type="button"
            >
              <span
                aria-hidden="true"
                className={colorSlot()}
                data-selected={colorItem.selected}
                style={{ backgroundColor: colorItem.color }}
              />
              <span
                aria-hidden="true"
                className={icon()}
                data-selected={colorItem.selected}
              >
                <span className={checkBadge()}>
                  <Icon icon="token-icon-color-select" size="current" />
                </span>
              </span>
            </button>
            {name && colorItem.selected && (
              <input
                disabled={disabled || colorItem.disabled}
                name={name}
                type="hidden"
                value={colorItem.color}
              />
            )}
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
      {immutable && (
        <span className="sr-only" id={readOnlyId}>
          Read-only color selection
        </span>
      )}
      {helpText && (
        <StatusText id={messageId} size={controlSize} status={validateStatus}>
          {helpText}
        </StatusText>
      )}
    </div>
  )
}
