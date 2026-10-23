/**
 * SearchForm — @techsio/ui-kit molecule.
 *
 * @component SearchForm
 * @componentVersion v1.1.2
 * @skill search-form-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the search-form-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  type SubmitEvent,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import type { VariantProps } from "tailwind-variants"
import { ActionIcon, type ActionIconProps } from "../atoms/action-icon"
import { Button as ButtonComponent, type ButtonProps } from "../atoms/button"
import type { IconType } from "../atoms/icon"
import { Input as InputComponent, type InputProps } from "../atoms/input"
import { Label, type LabelProps } from "../atoms/label"
import { StatusText, type StatusTextProps } from "../atoms/status-text"
import {
  type DescribedBy,
  joinDescribedBy,
  useDescribedBy,
  useRegisterDescription,
} from "../internal/described-by"
import { subscribeOwnerFormReset } from "../internal/form-control-lifecycle"
import { useEffectiveDisabled } from "../internal/use-effective-disabled"
import { tv } from "../utils"

const searchFormVariants = tv({
  slots: {
    // Layout-only wrapper. The input and button are composed side by side and
    // each keep their own border, background, radius, and focus ring so they
    // focus independently instead of sharing one ring around the whole group.
    root: ["relative grid"],
    control: ["flex items-stretch"],
    // Positioning context for the absolutely-placed clear button, and the
    // flex item that holds the input. `focus-within:z-10` lifts the focused
    // input (and its outline) above the adjacent button so the focus ring is
    // never painted underneath it.
    inputWrapper: ["relative min-w-0 flex-1", "focus-within:z-10"],
    // The input keeps its own styling/focus ring from the Input atom.
    input: ["w-full"],
    // The button keeps its own styling/focus ring from the Button atom.
    // `focus-visible:z-10` mirrors the input so a focused button outline wins.
    button: ["relative shrink-0", "focus-visible:z-10"],
    // The clear button (an ActionIcon) lives inside the input, pinned to the
    // trailing edge at the input's inline padding (set per size below) and
    // vertically centered. ActionIcon owns its size, glyph and hover pill.
    clearButton: ["absolute top-1/2 -translate-y-1/2"],
  },
  variants: {
    size: {
      // Pin the button to the shared form-control height so it always matches
      // the input height — including `lg`, which the Button atom sizes by
      // padding alone. The clear button trails the input by its inline padding.
      sm: {
        root: "gap-search-form-sm",
        button: "h-form-control-sm",
        input: "data-clearable:pe-(--height-form-control-sm)",
        clearButton: "end-(length:--padding-input-sm)",
      },
      md: {
        root: "gap-search-form-md",
        button: "h-form-control-md",
        input: "data-clearable:pe-(--height-form-control-md)",
        clearButton: "end-(length:--padding-input-md)",
      },
      lg: {
        root: "gap-search-form-lg",
        button: "h-form-control-lg",
        input: "data-clearable:pe-(--height-form-control-lg)",
        clearButton: "end-(length:--padding-input-lg)",
      },
    },
    gapped: {
      // Joined: strip the touching corners so the two controls read as one.
      false: {
        input: "rounded-e-none",
        button: "rounded-s-none",
      },
      // Detached: 8px gap and the controls keep their full rounded corners.
      true: { control: "gap-search-form-gapped" },
    },
  },
  defaultVariants: {
    size: "md",
    gapped: false,
  },
})

export type SearchFormSize = "sm" | "md" | "lg"

type SearchFormContextValue = {
  size: SearchFormSize
  readOnly: boolean
  disabled: boolean
  setInputReadOnly: (value: boolean) => void
  setInputDisabled: (value: boolean) => void
  hasLabel: boolean
  setHasLabel: (present: boolean) => void
  hasButton: boolean
  setHasButton: (present: boolean) => void
  validateStatus: "default" | "error" | "warning" | "success"
  descriptions: DescribedBy
  errors: DescribedBy
  gapped: boolean
  inputId: string
  inputValue: string
  setInputValue: (value: string) => void
  clearInput: () => void
  hasValue: boolean
  // The input wrapper element the clear button portals into so it renders
  // inside the input regardless of where it is composed in the JSX.
  clearSlot: HTMLDivElement | null
  setClearSlot: (element: HTMLDivElement | null) => void
  // Whether a clear button is composed, so the input can reserve trailing
  // padding for it only when one is present.
  hasClearButton: boolean
  setHasClearButton: (present: boolean) => void
}

const SearchFormContext = createContext<SearchFormContextValue | null>(null)

function useSearchFormContext() {
  const context = useContext(SearchFormContext)
  if (!context) {
    throw new Error("SearchForm components must be used within SearchForm")
  }
  return context
}

export type SearchFormProps = VariantProps<typeof searchFormVariants> &
  Omit<ComponentPropsWithoutRef<"form">, "size"> & {
    readOnly?: boolean
    disabled?: boolean
    validateStatus?: "default" | "error" | "warning" | "success"
    children: ReactNode
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
    ref?: Ref<HTMLFormElement>
  }

export function SearchForm({
  size = "md",
  gapped = false,
  readOnly = false,
  disabled: explicitDisabled = false,
  validateStatus = "default",
  children,
  defaultValue = "",
  value,
  onValueChange,
  className,
  ref,
  onSubmit,
  ...props
}: SearchFormProps) {
  const generatedId = useId()
  const inputId = `search-input-${generatedId}`
  const [formElement, setFormElement] = useState<HTMLFormElement | null>(null)
  const [clearSlot, setClearSlot] = useState<HTMLDivElement | null>(null)
  const disabled = useEffectiveDisabled(
    clearSlot ?? formElement,
    explicitDisabled
  )
  const formRef = useMemo(
    () => (node: HTMLFormElement | null) => {
      setFormElement(node)
      const cleanup = typeof ref === "function" ? ref(node) : undefined
      if (ref && typeof ref !== "function") {
        ref.current = node
      }
      return () => {
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
  const initialValue = useRef(defaultValue)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [hasClearButton, setHasClearButton] = useState(false)
  const [inputReadOnly, setInputReadOnly] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)
  const [hasLabel, setHasLabel] = useState(false)
  const [hasButton, setHasButton] = useState(false)
  const descriptions = useDescribedBy()
  const errors = useDescribedBy()
  const blocked = readOnly || disabled || inputReadOnly || inputDisabled
  const isControlled = value !== undefined
  const inputValue = isControlled ? value : internalValue

  const reset = useRef<() => void>(() => undefined)
  reset.current = () => {
    if (!isControlled) {
      setInternalValue(initialValue.current)
    }
    const input = clearSlot?.querySelector("input")
    if (input) {
      input.value = value ?? initialValue.current
    }
  }
  useEffect(() => {
    const input = clearSlot?.querySelector("input")
    return input
      ? subscribeOwnerFormReset(input, () => reset.current())
      : undefined
  }, [clearSlot])

  const setInputValue = (newValue: string) => {
    if (blocked) {
      return
    }
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  const clearInput = () => {
    setInputValue("")
    clearSlot?.querySelector("input")?.focus()
  }

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit?.(e)
  }

  const styles = searchFormVariants({ size, gapped })

  return (
    <SearchFormContext.Provider
      value={{
        size,
        gapped,
        readOnly: readOnly || inputReadOnly,
        disabled: disabled || inputDisabled,
        setInputReadOnly,
        setInputDisabled,
        validateStatus,
        descriptions,
        errors,
        hasLabel,
        setHasLabel,
        hasButton,
        setHasButton,
        inputId,
        inputValue,
        setInputValue,
        clearInput,
        hasValue: inputValue.length > 0,
        clearSlot,
        setClearSlot,
        hasClearButton,
        setHasClearButton,
      }}
    >
      <search>
        <form
          className={styles.root({ className })}
          onSubmit={handleSubmit}
          ref={formRef}
          {...props}
        >
          {children}
        </form>
      </search>
    </SearchFormContext.Provider>
  )
}

type SearchFormLabelProps = Omit<LabelProps, "htmlFor" | "size"> & {}

SearchForm.Label = function SearchFormLabel({
  children,
  className,
  ...props
}: SearchFormLabelProps) {
  const { inputId, size, setHasLabel } = useSearchFormContext()
  useEffect(() => {
    setHasLabel(true)
    return () => setHasLabel(false)
  }, [setHasLabel])

  return (
    <Label className={className} htmlFor={inputId} size={size} {...props}>
      {children}
    </Label>
  )
}

type SearchFormControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

SearchForm.Control = function SearchFormControl({
  children,
  className,
  ref,
  ...props
}: SearchFormControlProps) {
  const { size, gapped } = useSearchFormContext()
  const styles = searchFormVariants({ size, gapped })

  return (
    <div className={styles.control({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

type SearchFormInputProps = Omit<
  InputProps,
  "size" | "value" | "onChange" | "withButtonInside"
> & {}

SearchForm.Input = function SearchFormInput({
  className,
  placeholder = "Search...",
  ref,
  ...props
}: SearchFormInputProps) {
  const {
    inputId,
    inputValue,
    setInputValue,
    size,
    gapped,
    hasValue,
    hasClearButton,
    setClearSlot,
    readOnly,
    disabled,
    setInputReadOnly,
    setInputDisabled,
    hasLabel,
    hasButton,
    descriptions,
    errors,
    validateStatus,
  } = useSearchFormContext()
  useEffect(() => {
    setInputReadOnly(Boolean(props.readOnly))
    return () => setInputReadOnly(false)
  }, [props.readOnly, setInputReadOnly])
  useEffect(() => {
    setInputDisabled(Boolean(props.disabled))
    return () => setInputDisabled(false)
  }, [props.disabled, setInputDisabled])
  const styles = searchFormVariants({ size, gapped: gapped || !hasButton })

  return (
    <div className={styles.inputWrapper()} ref={setClearSlot}>
      <InputComponent
        aria-label={props["aria-label"] ?? (hasLabel ? undefined : "Search")}
        className={styles.input({ className })}
        data-clearable={
          hasValue && hasClearButton && !readOnly && !disabled ? "" : undefined
        }
        id={inputId}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        ref={ref}
        size={size}
        type="search"
        value={inputValue}
        {...props}
        aria-describedby={joinDescribedBy(
          props["aria-describedby"],
          descriptions.describedById
        )}
        aria-errormessage={
          validateStatus === "error" ? errors.describedById : undefined
        }
        aria-invalid={
          validateStatus === "error" || props["aria-invalid"] || undefined
        }
        data-readonly={readOnly ? "" : undefined}
        disabled={disabled || props.disabled}
        readOnly={readOnly || props.readOnly}
        variant={validateStatus === "default" ? props.variant : validateStatus}
      />
    </div>
  )
}

type SearchFormButtonProps = Omit<ButtonProps, "size"> & {
  showSearchIcon?: boolean
}

SearchForm.Button = function SearchFormButton({
  className,
  children,
  showSearchIcon = false,
  icon,
  iconPosition = "right",
  ...props
}: SearchFormButtonProps) {
  const { size, gapped, disabled, setHasButton } = useSearchFormContext()
  useEffect(() => {
    setHasButton(true)
    return () => setHasButton(false)
  }, [setHasButton])
  const styles = searchFormVariants({ size, gapped })

  // Use provided icon, or search icon if showSearchIcon is true
  const effectiveIcon =
    icon ?? (showSearchIcon ? "token-icon-search" : undefined)

  return (
    <ButtonComponent
      // An icon-only submit (no children) still needs a name; callers override.
      aria-label={children ? undefined : "Search"}
      className={styles.button({ className })}
      icon={effectiveIcon}
      iconPosition={iconPosition}
      size={size}
      type="submit"
      {...props}
      disabled={disabled || props.disabled}
    >
      {children}
    </ButtonComponent>
  )
}

type SearchFormClearButtonProps = Omit<
  ActionIconProps,
  "size" | "onClick" | "type" | "icon"
> & {
  icon?: IconType
}

SearchForm.ClearButton = function SearchFormClearButton({
  className,
  icon = "token-icon-close",
  tone = "neutral",
  ...props
}: SearchFormClearButtonProps) {
  const {
    size,
    gapped,
    clearInput,
    hasValue,
    inputValue,
    clearSlot,
    setHasClearButton,
    readOnly,
    disabled,
  } = useSearchFormContext()
  const styles = searchFormVariants({ size, gapped })

  // Tell the input a clear button is composed so it reserves trailing padding.
  useEffect(() => {
    setHasClearButton(true)
    return () => setHasClearButton(false)
  }, [setHasClearButton])

  if (readOnly || disabled || !(hasValue && clearSlot)) {
    return null
  }

  // Render inside the input wrapper so the clear button sits inside the input,
  // pinned to its trailing edge, instead of between the input and the button.
  // ActionIcon supplies the shared size, glyph and hover pill.
  return createPortal(
    <ActionIcon
      aria-label={`Clear search: ${inputValue}`}
      className={styles.clearButton({ className })}
      icon={icon}
      onClick={clearInput}
      size={size}
      tone={tone}
      {...props}
    />,
    clearSlot
  )
}

SearchForm.StatusText = function SearchFormStatusText({
  status: statusProp,
  size: sizeProp,
  ...props
}: StatusTextProps) {
  const { size, descriptions, errors, validateStatus } = useSearchFormContext()
  const generatedId = useId()
  const id = props.id ?? `${generatedId}-status`
  const status = statusProp ?? validateStatus
  useRegisterDescription(id, descriptions.registerDescription)
  useRegisterDescription(id, errors.registerDescription, status === "error")
  return (
    <StatusText {...props} id={id} size={sizeProp ?? size} status={status} />
  )
}

export { searchFormVariants, useSearchFormContext }

SearchForm.displayName = "SearchForm"
