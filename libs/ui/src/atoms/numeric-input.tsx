/**
 * NumericInput — @techsio/ui-kit atom.
 *
 * @component NumericInput
 * @componentVersion v1.3.0
 * @skill numeric-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the numeric-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import * as numberInput from "@zag-js/number-input"
import { normalizeProps, useMachine } from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react"
import {
  type DescribedBy,
  joinDescribedBy,
  useDescribedBy,
  useRegisterDescription,
} from "../internal/described-by"
import { tv } from "../utils"
import { Button } from "./button"
import type { IconType } from "./icon"
import { Input } from "./input"
import { StatusText, type StatusTextProps } from "./status-text"

// Zag guards native keys but not all machine actions (notably blur clamping,
// wheel and an already-running press). Enforce immutability at the value boundary.
const valueActions = numberInput.machine.implementations?.actions ?? {}
const guardValueAction =
  (action: typeof valueActions.increment) =>
  (params: Parameters<NonNullable<typeof valueActions.increment>>[0]) => {
    if (params.prop("readOnly") || params.computed("isDisabled")) {
      return
    }
    action?.(params)
  }
const readOnlySafeMachine: typeof numberInput.machine = {
  ...numberInput.machine,
  implementations: {
    ...numberInput.machine.implementations,
    actions: {
      ...valueActions,
      increment: guardValueAction(valueActions.increment),
      decrement: guardValueAction(valueActions.decrement),
      incrementToMax: guardValueAction(valueActions.incrementToMax),
      decrementToMin: guardValueAction(valueActions.decrementToMin),
      setValue: guardValueAction(valueActions.setValue),
      setRawValue: guardValueAction(valueActions.setRawValue),
      clearValue: guardValueAction(valueActions.clearValue),
      setClampedValue: guardValueAction(valueActions.setClampedValue),
      setFormattedValue: guardValueAction(valueActions.setFormattedValue),
    },
  },
}

const numericInputVariants = tv({
  slots: {
    root: ["relative flex flex-col"],
    container: [
      "group form-control-base numeric-input-validation numeric-input-readonly relative flex",
      "border-numeric-input-border",
      "min-w-0 items-center overflow-clip",
      "hover:border-numeric-input-border-hover",
      "focus-within:border-numeric-input-border-focus",
      "data-disabled:bg-numeric-input-bg-disabled",
      "data-disabled:border-numeric-input-border-disabled",
      "data-disabled:text-numeric-input-fg-disabled",
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
      "focus-visible:outline-hidden",
      "duration-0 data-invalid:focus:border-input-border-danger-focus",
    ],
    // Subtle divider from the input instead of a gray fill block; the gap-px
    // shows the field behind it as a hairline between the two arrows.
    triggerContainer: [
      "flex flex-row self-stretch",
      "border-numeric-input-border border-s",
    ],
    // Unified neutral icon-control treatment: transparent base (matches the
    // field, no "disabled" gray), neutral arrows, subtle neutral hover pill —
    // no blue arrow-on-gray. Glyph size is kept per NumericInput's own scale.
    trigger: [
      "flex min-h-numeric-input-trigger-min min-w-numeric-input-trigger-min flex-1 place-items-center",
      "px-numeric-input-trigger-x py-numeric-input-trigger-y",
      "bg-transparent hover:bg-numeric-input-trigger-bg-hover active:bg-numeric-input-trigger-bg-active",
      "text-numeric-input-trigger-fg",
      "cursor-pointer",
      "transition-colors duration-200 motion-reduce:transition-none",
      "disabled:cursor-not-allowed disabled:text-numeric-input-trigger-fg-disabled",
    ],
    scrubber: "absolute inset-0 cursor-ew-resize",
  },
  variants: {
    size: {
      sm: {
        root: "gap-numeric-input-sm text-numeric-input-sm",
        container: "h-form-control-sm rounded-numeric-input-sm",
        trigger: "text-numeric-input-sm",
        input: "ps-numeric-input-input-sm text-numeric-input-sm",
      },
      md: {
        root: "gap-numeric-input-md text-numeric-input-md",
        container: "h-form-control-md rounded-numeric-input-md",
        trigger: "text-numeric-input-md",
        input: "ps-numeric-input-input-md text-numeric-input-md",
      },
      lg: {
        root: "gap-numeric-input-lg text-numeric-input-lg",
        container: "h-form-control-lg rounded-numeric-input-lg",
        trigger: "text-numeric-input-lg",
        input: "ps-numeric-input-input-lg text-numeric-input-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

// Context for sharing state between sub-components
type NumericInputContextValue = {
  api: ReturnType<typeof numberInput.connect>
  size?: "sm" | "md" | "lg"
  styles: ReturnType<typeof numericInputVariants>
  invalid?: boolean
  validateStatus: "default" | "error" | "success" | "warning"
  describedBy?: string
  controlledValue?: string
  readOnly?: boolean
  disabled?: boolean
  description: DescribedBy
  errors: DescribedBy
  errorMessageId?: string
}

const triggerIconSizes = { sm: "xs", md: "sm", lg: "md" } as const

const NumericInputContext = createContext<NumericInputContextValue | null>(null)

function useNumericInputContext() {
  const context = useContext(NumericInputContext)
  if (!context) {
    throw new Error(
      "NumericInput components must be used within NumericInput.Root"
    )
  }
  return context
}

// Root component
export type NumericInputProps = Omit<
  numberInput.Props,
  "value" | "defaultValue" | "id"
> &
  Omit<
    ComponentPropsWithoutRef<"div">,
    "onChange" | "children" | "defaultValue"
  > & {
    size?: "sm" | "md" | "lg"
    value?: number | string
    defaultValue?: number | string
    validateStatus?: "default" | "error" | "success" | "warning"
    onChange?: (value: number) => void
    precision?: number
    children?: ReactNode
    describedBy?: string
    ref?: Ref<HTMLDivElement>
    id?: string
    locale?: string
  }

export function NumericInput({
  id,
  size,
  value,
  defaultValue,
  onChange,
  validateStatus = "default",
  dir = "ltr",
  describedBy,
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-invalid": ariaInvalid,
  precision,
  children,
  ref,
  className,
  locale = "cs-CZ",
  ...props
}: NumericInputProps) {
  const generatedId = useId()
  const description = useDescribedBy()
  const errors = useDescribedBy()
  const [machineProps, elementProps] = numberInput.splitProps(props)
  const {
    formatOptions,
    invalid: machineInvalid,
    disabled = false,
    required = false,
    step = 1,
    allowMouseWheel = true,
    clampValueOnBlur = true,
    spinOnPress = true,
    focusInputOnChange = true,
  } = machineProps
  const invalid =
    validateStatus === "error" ||
    machineInvalid ||
    (ariaInvalid !== undefined &&
      ariaInvalid !== false &&
      ariaInvalid !== "false")
  const resolvedFormatOptions =
    precision === undefined
      ? formatOptions
      : {
          ...(formatOptions ?? {}),
          minimumFractionDigits: Math.min(
            formatOptions?.minimumFractionDigits ?? 0,
            precision
          ),
          maximumFractionDigits: precision,
        }

  const formatValue = (inputValue: number | string) => {
    if (typeof inputValue === "number" && !Number.isFinite(inputValue)) {
      return ""
    }
    if (typeof inputValue === "string" || !resolvedFormatOptions) {
      return String(inputValue)
    }
    return new Intl.NumberFormat(locale, resolvedFormatOptions).format(
      inputValue
    )
  }

  const service = useMachine(readOnlySafeMachine, {
    ...machineProps,
    invalid,
    disabled,
    required,
    step,
    allowMouseWheel,
    clampValueOnBlur,
    spinOnPress,
    focusInputOnChange,
    id: id || generatedId,
    ids: id
      ? { ...machineProps.ids, input: machineProps.ids?.input ?? id }
      : machineProps.ids,
    dir,
    locale,
    value: value === undefined ? undefined : formatValue(value),
    defaultValue:
      defaultValue === undefined ? undefined : formatValue(defaultValue),
    formatOptions: resolvedFormatOptions,
    onValueChange: (details) => {
      onChange?.(details.valueAsNumber)
      machineProps.onValueChange?.(details)
    },
  })

  const api = numberInput.connect(service, normalizeProps)
  useEffect(() => {
    if (machineProps.readOnly || disabled) {
      // End an in-progress hold/drag when the parent locks the value.
      service.send({ type: "TRIGGER.PRESS_UP" })
      service.send({ type: "SCRUBBER.POINTER_UP" })
    }
  }, [machineProps.readOnly, disabled, service])
  useEffect(() => {
    // React's autoFocus runs before the parent machine starts. Reconcile that
    // existing DOM focus so typing and arrow keys work without refocusing.
    const inputId = api.getInputProps().id
    const input = inputId ? service.scope.getById(inputId) : null
    if (input && input === service.scope.getActiveElement() && !api.focused) {
      service.send({ type: "INPUT.FOCUS" })
    }
  }, [api, service])
  const styles = numericInputVariants({ size })
  const inputDisabled = api.getInputProps().disabled

  return (
    <NumericInputContext.Provider
      value={{
        api,
        size,
        styles,
        invalid: invalid || Boolean(errors.describedById),
        validateStatus:
          invalid || errors.describedById ? "error" : validateStatus,
        describedBy: joinDescribedBy(describedBy, ariaDescribedBy),
        description,
        errors,
        errorMessageId: ariaErrorMessage,
        readOnly: machineProps.readOnly,
        disabled: inputDisabled,
        controlledValue: typeof value === "string" ? value : undefined,
      }}
    >
      <div
        className={styles.root({ className })}
        ref={ref}
        {...api.getRootProps()}
        {...elementProps}
        onWheelCapture={(event) => {
          // Zag attaches a native wheel listener while focused. Its listener
          // remains attached when readOnly changes, so block it before target.
          if (inputDisabled || machineProps.readOnly) {
            event.stopPropagation()
          }
          elementProps.onWheelCapture?.(event)
        }}
      >
        {children}
      </div>
    </NumericInputContext.Provider>
  )
}

// Control component (wrapper for input + triggers)
type NumericInputControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

NumericInput.Control = function NumericInputControl({
  children,
  ref,
  className,
  ...props
}: NumericInputControlProps) {
  const { api, styles, invalid, readOnly, disabled, validateStatus } =
    useNumericInputContext()

  return (
    <div
      className={styles.container({ className })}
      ref={ref}
      {...api.getControlProps()}
      {...props}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid || undefined}
      data-readonly={readOnly ? "" : undefined}
      data-validation={
        validateStatus === "default" ? undefined : validateStatus
      }
    >
      {children}
    </div>
  )
}

// Input component
type NumericInputInputProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "size"
> & {
  ref?: Ref<HTMLInputElement>
}

NumericInput.Input = function NumericInputInput({
  ref,
  className,
  ...props
}: NumericInputInputProps) {
  const {
    api,
    styles,
    size,
    describedBy,
    controlledValue,
    description,
    errors,
    errorMessageId,
    invalid,
    readOnly,
    disabled,
  } = useNumericInputContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const mergedRef = useMemo(
    () => (node: HTMLInputElement | null) => {
      inputRef.current = node
      const cleanup = typeof ref === "function" ? ref(node) : undefined
      if (ref && typeof ref !== "function") {
        ref.current = node
      }
      return () => {
        inputRef.current = null
        if (typeof cleanup === "function") {
          cleanup()
        } else if (typeof ref === "function") {
          ref(null)
        } else if (ref) {
          ref.current = null
        }
      }
    },
    [ref]
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: Zag can synchronize the DOM after any machine update, even when the controlled draft is unchanged.
  useLayoutEffect(() => {
    if (controlledValue === undefined) {
      return
    }
    const view = inputRef.current?.ownerDocument.defaultView
    if (!view) {
      return
    }
    let cancelled = false
    let frame: number | undefined
    // Zag's React adapter dispatches input events in a microtask and then
    // formats the DOM in a frame. Keep its input handler uncontrolled, and
    // restore the authoritative text prop after that queued synchronization.
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      frame = view.requestAnimationFrame(() => {
        const input = inputRef.current
        if (!input || input.value === controlledValue) {
          return
        }
        const start = input.selectionStart
        const end = input.selectionEnd
        const direction = input.selectionDirection
        input.value = controlledValue
        if (
          input.ownerDocument.activeElement === input &&
          start !== null &&
          end !== null
        ) {
          input.setSelectionRange(
            Math.min(start, controlledValue.length),
            Math.min(end, controlledValue.length),
            direction ?? undefined
          )
        }
      })
    })
    return () => {
      cancelled = true
      if (frame !== undefined) {
        view.cancelAnimationFrame(frame)
      }
    }
  }, [api, controlledValue])

  const ariaDescribedBy = joinDescribedBy(
    props["aria-describedby"],
    describedBy,
    description.describedById
  )
  const errorId = joinDescribedBy(
    props["aria-errormessage"],
    errorMessageId,
    errors.describedById
  )
  const isInvalid =
    invalid || Boolean(errors.describedById) || props["aria-invalid"]

  return (
    <Input
      ref={controlledValue === undefined ? ref : mergedRef}
      {...api.getInputProps()}
      {...props}
      aria-describedby={ariaDescribedBy}
      aria-errormessage={errorId}
      aria-invalid={isInvalid || undefined}
      className={styles.input({ className })}
      disabled={disabled || props.disabled}
      readOnly={readOnly || props.readOnly}
      size={size}
    />
  )
}

// Increment Trigger component
type NumericInputIncrementTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> & {
  // === Button styling ===
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "warning"
  theme?: "solid" | "light" | "borderless" | "outlined"
  uppercase?: boolean
  block?: boolean

  // === Icon ===
  icon?: IconType
  iconPosition?: "left" | "right"
  iconSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "current"

  // === Loading state ===
  isLoading?: boolean
  loadingText?: string

  // === React ===
  ref?: Ref<HTMLButtonElement>
  children?: ReactNode
}

NumericInput.IncrementTrigger = function NumericInputIncrementTrigger({
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
}: NumericInputIncrementTriggerProps) {
  const { api, styles, size, readOnly, disabled } = useNumericInputContext()
  const resolvedIconSize = iconSize ?? triggerIconSizes[size ?? "md"]
  if (readOnly) {
    return null
  }

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
      {...api.getIncrementTriggerProps()}
      {...props}
      data-readonly-affordance=""
      disabled={
        api.getIncrementTriggerProps().disabled || disabled || props.disabled
      }
    >
      {children}
    </Button>
  )
}

// Decrement Trigger component
type NumericInputDecrementTriggerProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children"
> & {
  // === Button styling ===
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "warning"
  theme?: "solid" | "light" | "borderless" | "outlined"
  uppercase?: boolean
  block?: boolean

  // === Icon ===
  icon?: IconType
  iconPosition?: "left" | "right"
  iconSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "current"

  // === Loading state ===
  isLoading?: boolean
  loadingText?: string

  // === React ===
  ref?: Ref<HTMLButtonElement>
  children?: ReactNode
}

NumericInput.DecrementTrigger = function NumericInputDecrementTrigger({
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
}: NumericInputDecrementTriggerProps) {
  const { api, styles, size, readOnly, disabled } = useNumericInputContext()
  const resolvedIconSize = iconSize ?? triggerIconSizes[size ?? "md"]
  if (readOnly) {
    return null
  }

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
      {...api.getDecrementTriggerProps()}
      {...props}
      data-readonly-affordance=""
      disabled={
        api.getDecrementTriggerProps().disabled || disabled || props.disabled
      }
    >
      {children}
    </Button>
  )
}

// Scrubber component (for drag-to-change functionality)
type NumericInputScrubberProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

NumericInput.Scrubber = function NumericInputScrubber({
  ref,
  className,
  ...props
}: NumericInputScrubberProps) {
  const { api, styles, readOnly, disabled } = useNumericInputContext()
  if (readOnly || disabled) {
    return null
  }

  return (
    <div
      className={styles.scrubber({ className })}
      ref={ref}
      {...api.getScrubberProps()}
      {...props}
    />
  )
}

// Trigger Container component (wrapper for increment/decrement triggers)
type NumericInputTriggerContainerProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

NumericInput.TriggerContainer = function NumericInputTriggerContainer({
  children,
  ref,
  className,
  ...props
}: NumericInputTriggerContainerProps) {
  const { styles, readOnly } = useNumericInputContext()
  if (readOnly) {
    return null
  }

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

const ignoreDescription: DescribedBy["registerDescription"] = () => () => {
  // A neutral message never registers an error reference.
}

NumericInput.StatusText = function NumericInputStatusText({
  id,
  status = "default",
  size,
  showIcon,
  ...props
}: StatusTextProps) {
  const generatedId = useId()
  const messageId = id || generatedId
  const { size: fieldSize, description, errors } = useNumericInputContext()
  useRegisterDescription(messageId, description.registerDescription)
  useRegisterDescription(
    messageId,
    status === "error" ? errors.registerDescription : ignoreDescription
  )
  return (
    <StatusText
      {...props}
      id={messageId}
      showIcon={status !== "default" || showIcon}
      size={size ?? fieldSize}
      status={status}
    />
  )
}

// Export main component with all subcomponents
NumericInput.displayName = "NumericInput"
