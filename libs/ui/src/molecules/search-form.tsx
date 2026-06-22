import {
  type ComponentPropsWithoutRef,
  createContext,
  type FormEvent,
  type ReactNode,
  type Ref,
  useContext,
  useEffect,
  useId,
  useState,
} from "react"
import { createPortal } from "react-dom"
import type { VariantProps } from "tailwind-variants"
import { Button, type ButtonProps } from "../atoms/button"
import { Input, type InputProps } from "../atoms/input"
import { Label, type LabelProps } from "../atoms/label"
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
    // The clear button lives inside the input, pinned to the trailing edge at
    // the input's inline padding (set per size below). `inset-y-0` keeps the
    // hit target the full height of the input rather than just the icon.
    clearButton: [
      "absolute inset-y-0",
      "inline-flex items-center justify-center",
    ],
  },
  variants: {
    size: {
      // Pin the button to the shared form-control height so it always matches
      // the input height — including `lg`, which the Button atom sizes by
      // padding alone. The clear button trails the input by its inline padding.
      sm: {
        root: "gap-search-form-sm",
        button: "h-form-control-sm",
        clearButton: "end-(length:--padding-input-sm)",
      },
      md: {
        root: "gap-search-form-md",
        button: "h-form-control-md",
        clearButton: "end-(length:--padding-input-md)",
      },
      lg: {
        root: "gap-search-form-lg",
        button: "h-form-control-lg",
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

export interface SearchFormProps
  extends VariantProps<typeof searchFormVariants>,
    Omit<ComponentPropsWithoutRef<"form">, "size"> {
  children: ReactNode
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  ref?: Ref<HTMLFormElement>
}

export function SearchForm({
  size = "md",
  gapped = false,
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
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [clearSlot, setClearSlot] = useState<HTMLDivElement | null>(null)
  const [hasClearButton, setHasClearButton] = useState(false)
  const isControlled = value !== undefined
  const inputValue = isControlled ? value : internalValue

  const setInputValue = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  const clearInput = () => {
    setInputValue("")
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit?.(e)
  }

  const styles = searchFormVariants({ size, gapped })

  return (
    <SearchFormContext.Provider
      value={{
        size,
        gapped,
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
          ref={ref}
          {...props}
        >
          {children}
        </form>
      </search>
    </SearchFormContext.Provider>
  )
}

interface SearchFormLabelProps extends Omit<LabelProps, "htmlFor" | "size"> {}

SearchForm.Label = function SearchFormLabel({
  children,
  className,
  ...props
}: SearchFormLabelProps) {
  const { inputId, size } = useSearchFormContext()

  return (
    <Label className={className} htmlFor={inputId} size={size} {...props}>
      {children}
    </Label>
  )
}

interface SearchFormControlProps extends ComponentPropsWithoutRef<"div"> {
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

interface SearchFormInputProps
  extends Omit<
    InputProps,
    "size" | "value" | "onChange" | "withButtonInside"
  > {}

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
  } = useSearchFormContext()
  const styles = searchFormVariants({ size, gapped })

  return (
    <div className={styles.inputWrapper()} ref={setClearSlot}>
      <Input
        aria-label={props["aria-label"] || "Search"}
        className={styles.input({ className })}
        id={inputId}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        ref={ref}
        size={size}
        type="search"
        value={inputValue}
        withButtonInside={hasValue && hasClearButton ? "right" : undefined}
        {...props}
      />
    </div>
  )
}

interface SearchFormButtonProps extends Omit<ButtonProps, "size"> {
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
  const { size, gapped } = useSearchFormContext()
  const styles = searchFormVariants({ size, gapped })

  // Use provided icon, or search icon if showSearchIcon is true
  const effectiveIcon =
    icon ?? (showSearchIcon ? "token-icon-search" : undefined)

  return (
    <Button
      className={styles.button({ className })}
      icon={effectiveIcon}
      iconPosition={iconPosition}
      size={size}
      type="submit"
      {...props}
    >
      {children}
    </Button>
  )
}

interface SearchFormClearButtonProps
  extends Omit<ButtonProps, "size" | "onClick" | "type"> {}

SearchForm.ClearButton = function SearchFormClearButton({
  className,
  icon = "token-icon-close",
  theme = "unstyled",
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
  } = useSearchFormContext()
  const styles = searchFormVariants({ size, gapped })

  // Tell the input a clear button is composed so it reserves trailing padding.
  useEffect(() => {
    setHasClearButton(true)
    return () => setHasClearButton(false)
  }, [setHasClearButton])

  if (!(hasValue && clearSlot)) {
    return null
  }

  // Render inside the input wrapper so the clear button sits inside the input,
  // pinned to its trailing edge, instead of between the input and the button.
  return createPortal(
    <Button
      aria-label={`Clear search: ${inputValue}`}
      className={styles.clearButton({ className })}
      icon={icon}
      onClick={clearInput}
      size="current"
      theme={theme}
      type="button"
      {...props}
    />,
    clearSlot
  )
}

export { useSearchFormContext, searchFormVariants }

SearchForm.displayName = "SearchForm"
