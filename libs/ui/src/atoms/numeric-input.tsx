/**
 * NumericInput — @techsio/ui-kit atom.
 *
 * @component NumericInput
 * @componentVersion v1.3.3
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
  useState,
} from "react"
import { flushSync } from "react-dom"
import {
  isSilentChoiceReset,
  mergeChoiceInputProps,
  runSilentChoiceReset,
  trackChoiceFormControl,
} from "../internal/choice-control"
import {
  type DescribedBy,
  joinDescribedBy,
  useDescribedBy,
  useRegisterDescription,
} from "../internal/described-by"
import {
  createNumericInputEditing,
  type NumericInputEditing,
  syncNumericInputValue,
} from "../internal/numeric-input-editing"
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
const defaultComputed = numberInput.machine.computed
const readOnlySafeMachine: typeof numberInput.machine = {
  ...numberInput.machine,
  computed: defaultComputed && {
    ...defaultComputed,
    formattedValue(params) {
      const value = params.computed("valueAsNumber")
      // Integer presentation is not integer validation. Keep a fractional draft
      // available to the application instead of silently turning 1.5 into 2.
      if (
        Number.isFinite(value) &&
        !Number.isInteger(value) &&
        params.prop("formatOptions")?.maximumFractionDigits === 0
      ) {
        return params.context.get("value")
      }
      return defaultComputed.formattedValue(params)
    },
  },
  implementations: {
    ...numberInput.machine.implementations,
    actions: {
      ...valueActions,
      increment: guardValueAction(valueActions.increment),
      decrement: guardValueAction(valueActions.decrement),
      incrementToMax: guardValueAction(valueActions.incrementToMax),
      decrementToMin: guardValueAction(valueActions.decrementToMin),
      setValue() {
        // Native input is captured synchronously by NumericInput.Input. Zag's
        // queued event still sets its hint, but must not reread a mutable target.
      },
      setRawValue: guardValueAction(valueActions.setRawValue),
      clearValue: guardValueAction(valueActions.clearValue),
      setClampedValue: guardValueAction(valueActions.setClampedValue),
      setFormattedValue: guardValueAction(valueActions.setFormattedValue),
      invokeOnValueCommit({ computed, prop, event }) {
        let valueAsNumber = computed("valueAsNumber")
        let value = computed("formattedValue")
        // React batches the preceding clamp update. Zag's computed snapshot can
        // still contain the pre-blur draft when this action runs in that batch.
        if (
          event.type === "INPUT.BLUR" &&
          prop("clampValueOnBlur") &&
          !prop("readOnly") &&
          !computed("isDisabled") &&
          Number.isFinite(valueAsNumber)
        ) {
          const clamped = Math.min(
            prop("max"),
            Math.max(prop("min"), valueAsNumber)
          )
          if (clamped !== valueAsNumber) {
            valueAsNumber = clamped
            value = prop("formatOptions")
              ? computed("formatter").format(clamped)
              : String(clamped)
          }
        }
        prop("onValueCommit")?.({ value, valueAsNumber })
      },
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

const numericDraftPattern = /^[+-]?\d*(?:\.\d*)?$/

// Context for sharing state between sub-components
type NumericInputContextValue = {
  api: ReturnType<typeof numberInput.connect>
  size?: "sm" | "md" | "lg"
  styles: ReturnType<typeof numericInputVariants>
  invalid?: boolean
  validateStatus: "default" | "error" | "success" | "warning"
  describedBy?: string
  controlledValue?: string
  editing: NumericInputEditing
  onNativeInput: (input: HTMLInputElement) => void
  isValidInputDraft?: (value: string) => boolean
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

  const [editing] = useState(createNumericInputEditing)
  const [, refreshNativeValue] = useState(0)
  const controlledValue = value === undefined ? undefined : formatValue(value)
  const resolvedValue = editing.resolve(controlledValue)
  const coordinatedMachine = useMemo<typeof numberInput.machine>(() => {
    const actions = readOnlySafeMachine.implementations?.actions ?? {}
    const authoritativeAction =
      (action: typeof valueActions.increment) =>
      (params: Parameters<NonNullable<typeof valueActions.increment>>[0]) => {
        if (!(params.prop("readOnly") || params.computed("isDisabled"))) {
          editing.reset()
        }
        action?.(params)
      }
    return {
      ...readOnlySafeMachine,
      implementations: {
        ...readOnlySafeMachine.implementations,
        effects: {
          ...readOnlySafeMachine.implementations?.effects,
          trackFormControl({ scope, context, prop, action }) {
            const root = scope.getById(
              scope.ids?.root ?? `number-input:${scope.id}`
            )
            return trackChoiceFormControl(
              root,
              () => {
                editing.reset()
                // Reset discards optimistic echoes too: a controlled reset
                // restores the actual parent prop, without proposing a change.
                flushSync(() => refreshNativeValue((current) => current + 1))
                if (prop("value") === undefined) {
                  runSilentChoiceReset(context, () =>
                    context.set("value", context.initial("value"))
                  )
                }
                action(["syncInputElement"])
              },
              (fieldsetDisabled) =>
                context.set("fieldsetDisabled", fieldsetDisabled)
            )
          },
        },
        actions: {
          ...actions,
          syncInputElement({ scope, context, computed, event }) {
            if (editing.nativeOwnsValue) {
              return
            }
            const input = scope.getById<HTMLInputElement>(
              scope.ids?.input ?? `number-input:${scope.id}:input`
            )
            const nextValue = event.type.endsWith("CHANGE")
              ? context.get("value")
              : computed("formattedValue")
            if (input) {
              editing.schedule(input, () =>
                syncNumericInputValue(input, nextValue)
              )
            }
          },
          increment: authoritativeAction(actions.increment),
          decrement: authoritativeAction(actions.decrement),
          incrementToMax: authoritativeAction(actions.incrementToMax),
          decrementToMin: authoritativeAction(actions.decrementToMin),
          setRawValue: authoritativeAction(actions.setRawValue),
          clearValue: authoritativeAction(actions.clearValue),
        },
      },
    }
  }, [editing])

  const service = useMachine(coordinatedMachine, {
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
    value: resolvedValue,
    defaultValue:
      defaultValue === undefined ? undefined : formatValue(defaultValue),
    formatOptions: resolvedFormatOptions,
    onValueChange: (details) => {
      if (isSilentChoiceReset(service.context)) {
        return
      }
      editing.propose(details.value)
      onChange?.(details.valueAsNumber)
      machineProps.onValueChange?.(details)
    },
  })
  useLayoutEffect(() => {
    if (!editing.reconcile(controlledValue)) {
      return
    }
    const input = service.scope.getById<HTMLInputElement>(
      service.scope.ids?.input ?? `number-input:${service.scope.id}:input`
    )
    if (input && controlledValue !== undefined) {
      syncNumericInputValue(input, controlledValue)
    }
  }, [controlledValue, editing, service])

  const onNativeInput = (input: HTMLInputElement) => {
    if (machineProps.readOnly || service.computed("isDisabled")) {
      return
    }
    const draft = input.value
    editing.edit(draft)
    service.send({ type: "INPUT.CHANGE", value: draft, hint: "set" })
    // Capture and notify in the native event, before another task or a queued
    // projection can change input.value. This also renders a refusing parent’s
    // unchanged authority, without waiting for it to rerender on our behalf.
    flushSync(() => {
      service.context.set("value", draft)
      refreshNativeValue((current) => current + 1)
    })
  }

  // With no formatOptions Zag parses via parseFloat, so validate dot decimals
  // rather than applying a conflicting locale guard. Integer presentation must
  // also admit fractional drafts: precision is not an application validator.
  let isValidInputDraft: ((draft: string) => boolean) | undefined
  if (!resolvedFormatOptions) {
    isValidInputDraft = (draft) => numericDraftPattern.test(draft)
  } else if (
    resolvedFormatOptions.maximumFractionDigits === 0 &&
    (!resolvedFormatOptions.style || resolvedFormatOptions.style === "decimal")
  ) {
    const separator = new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value
    if (separator) {
      isValidInputDraft = (draft) => {
        const integerDraft = draft.replace(separator, "")
        return (
          !integerDraft.includes(separator) &&
          service.computed("parser").isValidPartialNumber(integerDraft)
        )
      }
    }
  }

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
        controlledValue: resolvedValue,
        editing,
        onNativeInput,
        isValidInputDraft,
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
    editing,
    onNativeInput,
    isValidInputDraft,
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
    const input = inputRef.current
    const cancel =
      input && controlledValue !== undefined
        ? editing.schedule(input, () => {
            if (input.value !== controlledValue) {
              syncNumericInputValue(input, controlledValue)
            }
          })
        : undefined
    return () => cancel?.()
  }, [api, controlledValue, editing])

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

  const machineInputProps = api.getInputProps()
  const inputProps = mergeChoiceInputProps(props, {
    ...machineInputProps,
    onChange(event) {
      onNativeInput(event.currentTarget)
    },
    onBlur(event) {
      editing.commit()
      machineInputProps.onBlur?.(event)
    },
    onKeyDown(event) {
      if (event.key === "Enter") {
        editing.commit()
      }
      machineInputProps.onKeyDown?.(event)
    },
    onBeforeInput(event) {
      if (!isValidInputDraft) {
        machineInputProps.onBeforeInput?.(event)
        return
      }
      const nativeEvent = event.nativeEvent as InputEvent
      if (
        nativeEvent.isComposing ||
        nativeEvent.inputType?.startsWith("delete")
      ) {
        return
      }
      const input = event.currentTarget
      const nextValue =
        input.value.slice(0, input.selectionStart ?? 0) +
        (nativeEvent.data ?? event.data ?? "") +
        input.value.slice(input.selectionEnd ?? 0)
      if (!isValidInputDraft(nextValue)) {
        event.preventDefault()
      }
    },
  })

  return (
    <Input
      ref={controlledValue === undefined ? ref : mergedRef}
      {...inputProps}
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
