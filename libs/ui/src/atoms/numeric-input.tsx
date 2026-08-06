/*
 * NumericInput — @techsio/ui-kit atom.
 *
 * @component NumericInput
 * @componentVersion v1.0.1
 * @skill numeric-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the numeric-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/number-input"
import type { Props as ZagNumberInputProps } from "@zag-js/number-input"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import { createContext, useContext, useId } from "react"
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"

import { tv } from "../utils"
import { Button } from "./button"
import type { IconType } from "./icon"
import { Input } from "./input"

type NumericInputSize = "sm" | "md" | "lg"

type NumericInputTriggerVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "warning"

type NumericInputTriggerTheme = "solid" | "light" | "borderless" | "outlined"

type NumericInputTriggerIconSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "current"

const numericInputVariants = tv({
  defaultVariants: {
    size: "md",
  },
  slots: {
    container: [
      "group form-control-base relative flex",
      "border-numeric-input-border",
      "items-center overflow-hidden",
      "hover:border-numeric-input-border-hover",
      "focus-within:border-numeric-input-border-focus",
      "data-disabled:bg-numeric-input-bg-disabled",
      "data-disabled:border-numeric-input-border-disabled",
      "data-disabled:text-numeric-input-fg-disabled",
      "data-invalid:bg-numeric-input-bg-invalid",
      "data-invalid:border-(length:--border-width-validation)",
      "data-invalid:border-numeric-input-border-invalid",
      "text-numeric-input-fg",
      "has-[input:not(:disabled):hover]:bg-numeric-input-input-bg-hover",
      "has-[input:focus]:bg-numeric-input-input-bg-focus",
      "focus-within:outline-(style:--default-ring-style) focus-within:outline-(length:--default-ring-width)",
      "focus-within:outline-numeric-input-ring",
      "focus-within:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    input: [
      "h-full rounded-none border-none",
      "bg-numeric-input-input-bg",
      "focus:bg-numeric-input-input-bg-focus",
      "hover:bg-numeric-input-input-bg-hover",
      "disabled:hover:bg-numeric-input-input-bg",
      "disabled:cursor-not-allowed",
      "focus-visible:outline-none",
      "duration-0 data-invalid:focus:border-input-border-danger-focus",
    ],
    root: ["relative flex"],
    scrubber: "absolute inset-0 cursor-ew-resize",
    // Unified neutral icon-control treatment: transparent base (matches the
    // field, no "disabled" gray), neutral arrows, subtle neutral hover pill —
    // no blue arrow-on-gray. Glyph size is kept per NumericInput's own scale.
    trigger: [
      "flex flex-1 place-items-center",
      "px-numeric-input-trigger-x py-numeric-input-trigger-y",
      "bg-transparent hover:bg-icon-control-bg-hover active:bg-icon-control-bg-active",
      "text-icon-control-fg",
      "cursor-pointer",
      "transition-colors duration-200 motion-reduce:transition-none",
      "disabled:cursor-not-allowed disabled:text-icon-control-fg-disabled",
    ],
    // Subtle divider from the input instead of a gray fill block; the gap-px
    // shows the field behind it as a hairline between the two arrows.
    triggerContainer: [
      "flex flex-col gap-px self-stretch",
      "border-numeric-input-border border-s",
    ],
  },
  variants: {
    size: {
      lg: {
        container: "h-form-control-lg rounded-numeric-input-lg",
        input: "pl-numeric-input-input-lg text-numeric-input-lg",
        root: "gap-numeric-input-lg text-numeric-input-lg",
        trigger: "text-numeric-input-lg",
      },
      md: {
        container: "h-form-control-md rounded-numeric-input-md",
        input: "pl-numeric-input-input-md text-numeric-input-md",
        root: "gap-numeric-input-md text-numeric-input-md",
        trigger: "text-numeric-input-md",
      },
      sm: {
        container: "h-form-control-sm rounded-numeric-input-sm",
        input: "pl-numeric-input-input-sm text-numeric-input-sm",
        root: "gap-numeric-input-sm text-numeric-input-sm",
        trigger: "text-numeric-input-sm",
      },
    },
  },
})

// Trigger glyphs follow the field scale; `md` — and an unset size — share `sm`,
// matching the previous nested ternary.
const triggerIconSizeBySize: Record<
  NumericInputSize,
  NumericInputTriggerIconSize
> = {
  lg: "md",
  md: "sm",
  sm: "xs",
}

const resolveTriggerIconSize = (
  iconSize: NumericInputTriggerIconSize | undefined,
  size: NumericInputSize | undefined,
): NumericInputTriggerIconSize =>
  iconSize ?? triggerIconSizeBySize[size ?? "md"]

// Context for sharing state between sub-components
interface NumericInputContextValue {
  api: ReturnType<typeof connect>
  size?: NumericInputSize | undefined
  styles: ReturnType<typeof numericInputVariants>
  invalid?: boolean | undefined
  describedBy?: string | undefined
}

// The provider value is built through this factory so the object is not
// constructed inside the JSX attribute; React Compiler handles the caching, so
// no manual memoization is added here.
const createNumericInputContextValue = (
  value: NumericInputContextValue,
): NumericInputContextValue => value

const NumericInputContext = createContext<NumericInputContextValue | null>(null)

const useNumericInputContext = (): NumericInputContextValue => {
  const context = useContext(NumericInputContext)
  if (!context) {
    throw new Error(
      "NumericInput components must be used within NumericInput.Root",
    )
  }
  return context
}

// Mirrors the previous `precision ? … : …` truthiness check: `0` and `NaN`
// leave the caller's formatOptions untouched.
const hasPrecision = (precision: number | undefined): precision is number =>
  precision !== undefined && precision !== 0 && !Number.isNaN(precision)

// Zag's number-input machine is driven by formatted strings; `undefined` means
// "not provided" and must stay that way so the machine keeps its own state.
const formatMachineValue = (
  value: number | undefined,
  locale: string,
  formatOptions: Intl.NumberFormatOptions | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (!formatOptions) {
    return String(value)
  }
  return new Intl.NumberFormat(locale, formatOptions).format(value)
}

interface NumericInputMachineOverrides {
  allowOverflow: ZagNumberInputProps["allowOverflow"]
  defaultValue: ZagNumberInputProps["defaultValue"]
  formatOptions: ZagNumberInputProps["formatOptions"]
  inputMode: ZagNumberInputProps["inputMode"]
  invalid: ZagNumberInputProps["invalid"]
  max: ZagNumberInputProps["max"]
  min: ZagNumberInputProps["min"]
  name: ZagNumberInputProps["name"]
  pattern: ZagNumberInputProps["pattern"]
  value: ZagNumberInputProps["value"]
}

// `exactOptionalPropertyTypes` rejects an explicit `undefined` for these optional
// machine props, so each one is spread in only when it was actually provided.
const definedMachineProps = ({
  allowOverflow,
  defaultValue,
  formatOptions,
  inputMode,
  invalid,
  max,
  min,
  name,
  pattern,
  value,
}: NumericInputMachineOverrides) => ({
  ...(min !== undefined && { min }),
  ...(max !== undefined && { max }),
  ...(name !== undefined && { name }),
  ...(pattern !== undefined && { pattern }),
  ...(inputMode !== undefined && { inputMode }),
  ...(invalid !== undefined && { invalid }),
  ...(value !== undefined && { value }),
  ...(defaultValue !== undefined && { defaultValue }),
  ...(allowOverflow !== undefined && { allowOverflow }),
  ...(formatOptions !== undefined && { formatOptions }),
})

// Root component
export type NumericInputProps = Omit<
  ZagNumberInputProps,
  "value" | "defaultValue" | "id"
> &
  Omit<ComponentPropsWithoutRef<"div">, "onChange" | "children"> & {
    size?: NumericInputSize | undefined
    value?: number | undefined
    defaultValue?: number | undefined
    onChange?: ((value: number) => void) | undefined
    precision?: number | undefined
    children?: ReactNode | undefined
    describedBy?: string | undefined
    ref?: Ref<HTMLDivElement> | undefined
    id?: string | undefined
    locale?: string | undefined
  }

export const NumericInput = ({
  id,
  name,
  size,
  disabled = false,
  required = false,
  pattern,
  readOnly,
  inputMode,
  value,
  defaultValue,
  onChange,
  dir = "ltr",
  describedBy,
  min,
  max,
  step = 1,
  precision,
  allowMouseWheel = true,
  allowOverflow,
  clampValueOnBlur = true,
  spinOnPress = true,
  formatOptions,
  invalid,
  children,
  ref,
  className,
  locale = "cs-CZ",
  ...props
}: NumericInputProps) => {
  const generatedId = useId()
  const uniqueId = id ?? generatedId
  const resolvedFormatOptions = hasPrecision(precision)
    ? { ...formatOptions, maximumFractionDigits: precision }
    : formatOptions

  const stringValue = formatMachineValue(value, locale, resolvedFormatOptions)
  const stringDefaultValue = formatMachineValue(
    defaultValue,
    locale,
    resolvedFormatOptions,
  )

  const service = useMachine(machine, {
    allowMouseWheel,
    clampValueOnBlur,
    dir,
    disabled,
    focusInputOnChange: true,
    id: uniqueId,
    locale,
    onValueChange: (details) => {
      onChange?.(details.valueAsNumber)
    },
    readOnly,
    required,
    spinOnPress,
    step,
    ...definedMachineProps({
      allowOverflow,
      defaultValue: stringDefaultValue,
      formatOptions: resolvedFormatOptions,
      inputMode,
      invalid,
      max,
      min,
      name,
      pattern,
      value: stringValue,
    }),
  })

  const api = connect(service, normalizeProps)
  const styles = numericInputVariants({ size })

  const contextValue = createNumericInputContextValue({
    api,
    describedBy,
    invalid,
    size,
    styles,
  })

  return (
    <NumericInputContext.Provider value={contextValue}>
      <div
        className={styles.root({ className })}
        ref={ref}
        {...mergeProps(api.getRootProps(), props)}
      >
        {children}
      </div>
    </NumericInputContext.Provider>
  )
}

// Control component (wrapper for input + triggers)
interface NumericInputControlProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

const NumericInputControl = ({
  children,
  ref,
  className,
  ...props
}: NumericInputControlProps) => {
  const { api, styles, invalid } = useNumericInputContext()

  return (
    <div
      className={styles.container({ className })}
      ref={ref}
      {...mergeProps(api.getControlProps(), props)}
      data-invalid={invalid ?? undefined}
    >
      {children}
    </div>
  )
}

NumericInput.Control = NumericInputControl

// Input component
interface NumericInputInputProps extends Omit<
  ComponentPropsWithoutRef<"input">,
  "size"
> {
  ref?: Ref<HTMLInputElement> | undefined
}

const NumericInputInput = ({
  ref,
  className,
  ...props
}: NumericInputInputProps) => {
  const { api, styles, describedBy } = useNumericInputContext()
  const ariaDescribedBy =
    [props["aria-describedby"], describedBy].filter(Boolean).join(" ") ||
    undefined

  return (
    <Input
      ref={ref}
      {...mergeProps(api.getInputProps(), props)}
      aria-describedby={ariaDescribedBy}
      className={styles.input({ className })}
    />
  )
}

NumericInput.Input = NumericInputInput

// Increment Trigger component
interface NumericInputIncrementTriggerProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> {
  // === Button styling ===
  variant?: NumericInputTriggerVariant | undefined
  theme?: NumericInputTriggerTheme | undefined
  uppercase?: boolean | undefined
  block?: boolean | undefined

  // === Icon ===
  icon?: IconType | undefined
  iconPosition?: "left" | "right" | undefined
  iconSize?: NumericInputTriggerIconSize | undefined

  // === Loading state ===
  isLoading?: boolean | undefined
  loadingText?: string | undefined

  // === React ===
  ref?: Ref<HTMLButtonElement> | undefined
  children?: ReactNode | undefined
}

const NumericInputIncrementTrigger = ({
  // Button props with defaults
  variant = "primary",
  theme = "borderless",
  icon = "token-icon-numeric-input-increment",
  iconPosition = "left",
  iconSize,
  uppercase,
  block,
  isLoading,
  loadingText,

  // React
  ref,
  className,
  children,
  ...props
}: NumericInputIncrementTriggerProps) => {
  const { api, styles, size } = useNumericInputContext()
  const resolvedIconSize = resolveTriggerIconSize(iconSize, size)

  return (
    <Button
      block={block}
      className={styles.trigger({ className })}
      icon={icon}
      iconPosition={iconPosition}
      iconSize={resolvedIconSize}
      isLoading={isLoading}
      loadingText={loadingText}
      ref={ref}
      size="current"
      theme={theme}
      uppercase={uppercase}
      variant={variant}
      {...mergeProps(api.getIncrementTriggerProps(), props)}
    >
      {children}
    </Button>
  )
}

NumericInput.IncrementTrigger = NumericInputIncrementTrigger

// Decrement Trigger component
interface NumericInputDecrementTriggerProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> {
  // === Button styling ===
  variant?: NumericInputTriggerVariant | undefined
  theme?: NumericInputTriggerTheme | undefined
  uppercase?: boolean | undefined
  block?: boolean | undefined

  // === Icon ===
  icon?: IconType | undefined
  iconPosition?: "left" | "right" | undefined
  iconSize?: NumericInputTriggerIconSize | undefined

  // === Loading state ===
  isLoading?: boolean | undefined
  loadingText?: string | undefined

  // === React ===
  ref?: Ref<HTMLButtonElement> | undefined
  children?: ReactNode | undefined
}

const NumericInputDecrementTrigger = ({
  // Button props with defaults
  variant = "primary",
  theme = "borderless",
  icon = "token-icon-numeric-input-decrement",
  iconPosition = "left",
  iconSize,
  uppercase,
  block,
  isLoading,
  loadingText,

  // React
  ref,
  className,
  children,
  ...props
}: NumericInputDecrementTriggerProps) => {
  const { api, styles, size } = useNumericInputContext()
  const resolvedIconSize = resolveTriggerIconSize(iconSize, size)

  return (
    <Button
      block={block}
      className={styles.trigger({ className })}
      icon={icon}
      iconPosition={iconPosition}
      iconSize={resolvedIconSize}
      isLoading={isLoading}
      loadingText={loadingText}
      ref={ref}
      size="current"
      theme={theme}
      uppercase={uppercase}
      variant={variant}
      {...mergeProps(api.getDecrementTriggerProps(), props)}
    >
      {children}
    </Button>
  )
}

NumericInput.DecrementTrigger = NumericInputDecrementTrigger

// Scrubber component (for drag-to-change functionality)
interface NumericInputScrubberProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

const NumericInputScrubber = ({
  ref,
  className,
  ...props
}: NumericInputScrubberProps) => {
  const { api, styles } = useNumericInputContext()

  return (
    <div
      className={styles.scrubber({ className })}
      ref={ref}
      {...mergeProps(api.getScrubberProps(), props)}
    />
  )
}

NumericInput.Scrubber = NumericInputScrubber

// Trigger Container component (wrapper for increment/decrement triggers)
interface NumericInputTriggerContainerProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

const NumericInputTriggerContainer = ({
  children,
  ref,
  className,
  ...props
}: NumericInputTriggerContainerProps) => {
  const { styles } = useNumericInputContext()

  return (
    <div
      className={styles.triggerContainer({ className })}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
}

NumericInput.TriggerContainer = NumericInputTriggerContainer

// Export main component with all subcomponents
NumericInput.displayName = "NumericInput"
