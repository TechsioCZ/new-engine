/**
 * NumericInput — @techsio/ui-kit atom.
 *
 * @component NumericInput
 * @componentVersion v1.1.1
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
import { tv } from "../utils"
import { Button } from "./button"
import type { IconType } from "./icon"
import { Input } from "./input"

const numericInputVariants = tv({
  slots: {
    root: ["relative flex"],
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
    // Subtle divider from the input instead of a gray fill block; the gap-px
    // shows the field behind it as a hairline between the two arrows.
    triggerContainer: [
      "flex flex-col gap-px self-stretch",
      "border-numeric-input-border border-s",
    ],
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
    scrubber: "absolute inset-0 cursor-ew-resize",
  },
  variants: {
    size: {
      sm: {
        root: "gap-numeric-input-sm text-numeric-input-sm",
        container: "h-form-control-sm rounded-numeric-input-sm",
        trigger: "text-numeric-input-sm",
        input: "pl-numeric-input-input-sm text-numeric-input-sm",
      },
      md: {
        root: "gap-numeric-input-md text-numeric-input-md",
        container: "h-form-control-md rounded-numeric-input-md",
        trigger: "text-numeric-input-md",
        input: "pl-numeric-input-input-md text-numeric-input-md",
      },
      lg: {
        root: "gap-numeric-input-lg text-numeric-input-lg",
        container: "h-form-control-lg rounded-numeric-input-lg",
        trigger: "text-numeric-input-lg",
        input: "pl-numeric-input-input-lg text-numeric-input-lg",
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
  describedBy?: string
  controlledValue?: string
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
  dir = "ltr",
  describedBy,
  precision,
  children,
  ref,
  className,
  locale = "cs-CZ",
  ...props
}: NumericInputProps) {
  const generatedId = useId()
  const [machineProps, elementProps] = numberInput.splitProps(props)
  const {
    formatOptions,
    invalid,
    disabled = false,
    required = false,
    step = 1,
    allowMouseWheel = true,
    clampValueOnBlur = true,
    spinOnPress = true,
    focusInputOnChange = true,
  } = machineProps
  const resolvedFormatOptions = precision
    ? { ...(formatOptions ?? {}), maximumFractionDigits: precision }
    : formatOptions

  const formatValue = (inputValue: number | string) => {
    if (typeof inputValue === "string" || !resolvedFormatOptions) {
      return String(inputValue)
    }
    return new Intl.NumberFormat(locale, resolvedFormatOptions).format(
      inputValue
    )
  }

  const service = useMachine(numberInput.machine, {
    ...machineProps,
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
    value: value !== undefined ? formatValue(value) : undefined,
    defaultValue:
      defaultValue !== undefined ? formatValue(defaultValue) : undefined,
    formatOptions: resolvedFormatOptions,
    onValueChange: (details) => {
      onChange?.(details.valueAsNumber)
      machineProps.onValueChange?.(details)
    },
  })

  const api = numberInput.connect(service, normalizeProps)
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
        invalid,
        describedBy,
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
interface NumericInputControlProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>
}

NumericInput.Control = function NumericInputControl({
  children,
  ref,
  className,
  ...props
}: NumericInputControlProps) {
  const { api, styles, invalid } = useNumericInputContext()

  return (
    <div
      className={styles.container({ className })}
      ref={ref}
      {...api.getControlProps()}
      {...props}
      data-invalid={invalid || undefined}
    >
      {children}
    </div>
  )
}

// Input component
interface NumericInputInputProps
  extends Omit<ComponentPropsWithoutRef<"input">, "size"> {
  ref?: Ref<HTMLInputElement>
}

NumericInput.Input = function NumericInputInput({
  ref,
  className,
  ...props
}: NumericInputInputProps) {
  const { api, styles, describedBy, controlledValue } = useNumericInputContext()
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

  const ariaDescribedBy =
    [props["aria-describedby"], describedBy].filter(Boolean).join(" ") ||
    undefined

  return (
    <Input
      ref={controlledValue === undefined ? ref : mergedRef}
      {...api.getInputProps()}
      {...props}
      aria-describedby={ariaDescribedBy}
      className={styles.input({ className })}
    />
  )
}

// Increment Trigger component
interface NumericInputIncrementTriggerProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
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
  const { api, styles, size } = useNumericInputContext()
  const resolvedIconSize = iconSize ?? triggerIconSizes[size ?? "md"]

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
    >
      {children}
    </Button>
  )
}

// Decrement Trigger component
interface NumericInputDecrementTriggerProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
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
  const { api, styles, size } = useNumericInputContext()
  const resolvedIconSize = iconSize ?? triggerIconSizes[size ?? "md"]

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
    >
      {children}
    </Button>
  )
}

// Scrubber component (for drag-to-change functionality)
interface NumericInputScrubberProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>
}

NumericInput.Scrubber = function NumericInputScrubber({
  ref,
  className,
  ...props
}: NumericInputScrubberProps) {
  const { api, styles } = useNumericInputContext()

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
interface NumericInputTriggerContainerProps
  extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>
}

NumericInput.TriggerContainer = function NumericInputTriggerContainer({
  children,
  ref,
  className,
  ...props
}: NumericInputTriggerContainerProps) {
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

// Export main component with all subcomponents
NumericInput.displayName = "NumericInput"
