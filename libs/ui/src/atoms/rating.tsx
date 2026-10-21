/**
 * Rating — @techsio/ui-kit atom.
 *
 * @component Rating
 * @componentVersion v1.2.1
 * @skill rating-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the rating-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, type IntlTranslations, machine } from "@zag-js/rating-group"
import { normalizeProps, useMachine } from "@zag-js/react"
import { type HTMLAttributes, type ReactNode, useId } from "react"
import type { VariantProps } from "tailwind-variants"
import { joinDescribedBy } from "../internal/described-by"
import { tv } from "../utils"
import { trackChoiceFormControl, useChoiceFocusRecovery } from "./checkbox"
import { Label } from "./label"
import { StatusText } from "./status-text"

/** Clamp editable scores to their scale and precision; display averages retain fractions. */
function normalizeRating(
  value: number,
  count: number,
  allowHalf: boolean,
  readOnly: boolean
) {
  const bounded = Math.max(
    0,
    Math.min(count, Number.isFinite(value) ? value : 0)
  )
  if (readOnly) {
    return bounded
  }
  const step = allowHalf ? 2 : 1
  return Math.round(bounded * step) / step
}

const ratingChoiceMachine: typeof machine = {
  ...machine,
  watch({ track, action, prop, context }) {
    track(
      [() => prop("count"), () => prop("allowHalf"), () => prop("readOnly")],
      () => {
        action(["clearHoveredValue"])
        // Controlled values are normalized projections, never unsolicited parent writes.
        if (prop("value") !== undefined) {
          return
        }
        const value = normalizeRating(
          context.get("value"),
          prop("count"),
          !!prop("allowHalf"),
          !!prop("readOnly")
        )
        if (value !== context.get("value")) {
          context.set("value", value)
        }
      }
    )
    track([() => context.get("value")], () => action(["dispatchChangeEvent"]))
  },
  implementations: {
    ...machine.implementations,
    effects: {
      ...machine.implementations?.effects,
      trackFormControlState({ scope, context, prop }) {
        const root = scope.getById(scope.ids?.root ?? `rating:${scope.id}`)
        return trackChoiceFormControl(
          root,
          () =>
            context.set(
              "value",
              normalizeRating(
                context.initial("value"),
                prop("count"),
                !!prop("allowHalf"),
                !!prop("readOnly")
              )
            ),
          (disabled) => context.set("fieldsetDisabled", disabled)
        )
      },
    },
  },
}

const rating = tv({
  slots: {
    root: "grid min-w-0 max-w-full items-center",
    control:
      "form-control-readonly focus-visible:rating-focus-outline inline-flex w-fit max-w-full flex-wrap items-center",
    item: [
      "inline-grid min-h-rating-target min-w-rating-target shrink-0 place-items-center",
      "cursor-pointer data-disabled:cursor-not-allowed",
      "focus-visible:rating-focus-outline",
    ],
    glyph: [
      "token-icon-rating pointer-events-none text-rating-fg-empty",
      "transition-colors duration-200 motion-reduce:transition-none",
      "data-highlighted:not-data-half:token-icon-rating-selected data-highlighted:not-data-disabled:text-rating-fg-selected",
      "data-half:token-icon-rating-half rtl:data-half:-scale-x-100",
      "data-disabled:text-rating-fg-disabled",
    ],
    valueText:
      "text-rating-fg-selected text-rating-value tabular-nums data-disabled:text-rating-fg-disabled",
  },
  variants: {
    size: {
      sm: {
        root: "gap-rating-sm",
        control: "gap-rating-sm",
        glyph: "text-rating-sm",
      },
      md: {
        root: "gap-rating-md",
        control: "gap-rating-md",
        glyph: "text-rating-md",
      },
      lg: {
        root: "gap-rating-lg",
        control: "gap-rating-lg",
        glyph: "text-rating-lg",
      },
    },
    isDisplay: { true: { item: "cursor-default" }, false: {} },
  },
  defaultVariants: { size: "md" },
})

type RatingVariants = Omit<VariantProps<typeof rating>, "isDisplay">
export type RatingProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> &
  RatingVariants & {
    value?: number
    defaultValue?: number
    count?: number
    labelText?: string
    readOnly?: boolean
    disabled?: boolean
    allowHalf?: boolean
    name?: string
    dir?: "ltr" | "rtl"
    translations?: IntlTranslations
    helpText?: ReactNode
    validateStatus?: "default" | "error" | "warning" | "success"
    onChange?: (value: number) => void
    onHoverChange?: (value: number) => void
  }

export function Rating({
  value,
  defaultValue = 0,
  count = 5,
  labelText,
  readOnly = false,
  disabled = false,
  allowHalf = true,
  name,
  dir = "ltr",
  translations,
  helpText,
  validateStatus = "default",
  onChange,
  onHoverChange,
  size = "md",
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: RatingProps) {
  const generatedId = useId()
  const helpTextId = useId()
  const scoreId = useId()
  const id = props.id || generatedId
  const invalid = validateStatus === "error"
  const describedBy = joinDescribedBy(
    ariaDescribedBy,
    scoreId,
    helpText ? helpTextId : undefined
  )
  const errorMessageId = invalid && helpText ? helpTextId : undefined
  const interactive = !(readOnly || disabled)
  const normalizedCount = Number.isFinite(count)
    ? Math.max(1, Math.floor(count))
    : 5
  const focusRef = useChoiceFocusRecovery('[role="radio"]')
  const service = useMachine(ratingChoiceMachine, {
    id,
    count: normalizedCount,
    value:
      value === undefined
        ? undefined
        : normalizeRating(value, normalizedCount, allowHalf, readOnly),
    defaultValue: normalizeRating(
      defaultValue,
      normalizedCount,
      allowHalf,
      readOnly
    ),
    disabled,
    readOnly: readOnly && !disabled,
    allowHalf,
    name,
    dir,
    translations,
    onValueChange: ({ value: newValue }) => {
      if (interactive) {
        onChange?.(newValue)
      }
    },
    onHoverChange: ({ hoveredValue }) => {
      if (interactive) {
        onHoverChange?.(hoveredValue)
      }
    },
  })
  const api = connect(service, normalizeProps)
  const isDisplay = readOnly && !disabled
  const styles = rating({ size, isDisplay })

  return (
    <div
      className={styles.root({ className })}
      {...api.getRootProps()}
      {...props}
    >
      <RatingLabel
        api={api}
        disabled={disabled}
        isDisplay={isDisplay}
        labelText={labelText}
        size={size}
      />
      <input
        {...api.getHiddenInputProps()}
        defaultValue={undefined}
        value={api.value}
      />
      <div
        className={styles.control()}
        {...getRatingControlProps(
          api,
          isDisplay,
          labelText,
          ariaLabel,
          ariaLabelledBy
        )}
        aria-describedby={describedBy}
        aria-errormessage={errorMessageId}
        aria-invalid={invalid || undefined}
        data-disabled={disabled ? "" : undefined}
        data-readonly={isDisplay ? "" : undefined}
        ref={focusRef}
      >
        <RatingItems
          api={api}
          describedBy={describedBy}
          errorMessageId={errorMessageId}
          invalid={invalid}
          isDisplay={isDisplay}
          styles={styles}
          translations={translations}
        />
      </div>
      <span
        className={styles.valueText()}
        data-disabled={disabled ? "" : undefined}
        id={scoreId}
      >
        {Math.max(0, api.value)} / {normalizedCount}
      </span>
      {helpText && (
        <StatusText id={helpTextId} size={size} status={validateStatus}>
          {helpText}
        </StatusText>
      )}
    </div>
  )
}

type RatingApi = ReturnType<typeof connect>

function RatingLabel({
  api,
  labelText,
  size,
  isDisplay,
  disabled,
}: {
  api: RatingApi
  labelText?: string
  size: RatingProps["size"]
  isDisplay: boolean
  disabled: boolean
}) {
  if (!labelText) {
    return null
  }
  return isDisplay ? (
    <Label aria-hidden size={size}>
      {labelText}
    </Label>
  ) : (
    <Label disabled={disabled} size={size} {...api.getLabelProps()}>
      {labelText}
    </Label>
  )
}

function getRatingControlProps(
  api: RatingApi,
  isDisplay: boolean,
  labelText?: string,
  ariaLabel?: string,
  ariaLabelledBy?: string
): HTMLAttributes<HTMLDivElement> {
  if (isDisplay) {
    const label = labelText ?? ariaLabel
    return {
      role: "img",
      "aria-labelledby": ariaLabelledBy,
      "aria-label": `${label ? `${label}: ` : ""}${Math.max(0, api.value)} out of ${api.count}`,
      tabIndex: 0,
      "aria-description": "Read-only rating",
    }
  }
  const visibleLabelId =
    labelText && !ariaLabel ? api.getLabelProps().id : undefined
  return {
    ...api.getControlProps(),
    "aria-label":
      ariaLabel ?? (labelText || ariaLabelledBy ? undefined : "Rating"),
    "aria-labelledby": ariaLabelledBy ?? visibleLabelId,
  }
}

function RatingItems({
  api,
  styles,
  isDisplay,
  describedBy,
  errorMessageId,
  invalid,
  translations,
}: {
  api: ReturnType<typeof connect>
  styles: ReturnType<typeof rating>
  isDisplay: boolean
  describedBy?: string
  errorMessageId?: string
  invalid: boolean
  translations?: IntlTranslations
}) {
  return (
    <>
      {api.items.map((index) => {
        const itemProps = api.getItemProps({ index })
        const checked = api.value > 0 && Math.ceil(api.value) === index
        const tabIndex = index === Math.max(1, Math.ceil(api.value)) ? 0 : -1
        const focusableProps = {
          ...itemProps,
          "aria-checked": checked,
          tabIndex: itemProps["aria-disabled"] ? undefined : tabIndex,
          "aria-label": checked
            ? (translations?.ratingValueText?.(api.value) ??
              `${api.value} stars`)
            : itemProps["aria-label"],
        }
        return (
          <span
            className={styles.item()}
            key={index}
            {...(isDisplay ? pickDataAttributes(itemProps) : focusableProps)}
            aria-describedby={isDisplay ? undefined : describedBy}
            aria-errormessage={isDisplay ? undefined : errorMessageId}
            aria-invalid={(!isDisplay && invalid) || undefined}
          >
            <span
              aria-hidden="true"
              className={styles.glyph()}
              {...pickDataAttributes(itemProps)}
            />
          </span>
        )
      })}
    </>
  )
}

function pickDataAttributes(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => key.startsWith("data-"))
  )
}
