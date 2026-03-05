import {
  type ComponentPropsWithoutRef,
  createContext,
  type FormEvent,
  type ReactNode,
  type Ref,
  useContext,
  useId,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button, type ButtonProps } from "../atoms/button"
import { Input, type InputProps } from "../atoms/input"
import { Label, type LabelProps } from "../atoms/label"
import { tv } from "../utils"

const searchFormVariants = tv({
  slots: {
    root: ["relative grid"],
    control: [
      "relative flex items-center overflow-hidden",
      "form-control-base",
      "hover:border-input-border-hover",
      "focus-within:border-input-border-focus",
      "focus-within:outline-(style:--default-ring-style) focus-within:outline-(length:--default-ring-width)",
      "focus-within:outline-input-ring",
      "focus-within:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    input: [
      "peer",
      "min-w-0 flex-1",
      "border-none bg-transparent",
      "focus-visible:outline-none",
    ],
    button: [
      "h-full shrink-0 items-center rounded-l-none",
    ],
    clearButton: [
      "h-full shrink-0 rounded-none p-search-form-clear-button",
      "peer-hover:bg-input-hover peer-focus:bg-input-focus",
    ],
  },
  variants: {
    size: {
      sm: {
        root: "gap-search-form-sm",
        control:
          "h-form-control-sm rounded-form-control-sm",
      },
      md: {
        root: "gap-search-form-md",
        control:
          "h-form-control-md rounded-form-control-md",
      },
      lg: {
        root: "gap-search-form-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export type SearchFormSize = "sm" | "md" | "lg"

type SearchFormContextValue = {
  size: SearchFormSize
  inputId: string
  inputValue: string
  setInputValue: (value: string) => void
  clearInput: () => void
  hasValue: boolean
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

  const styles = searchFormVariants({ size })

  return (
    <SearchFormContext.Provider
      value={{
        size,
        inputId,
        inputValue,
        setInputValue,
        clearInput,
        hasValue: inputValue.length > 0,
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
  const { size } = useSearchFormContext()
  const styles = searchFormVariants({ size })

  return (
    <div className={styles.control({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

interface SearchFormInputProps
  extends Omit<InputProps, "size" | "value" | "onChange"> {}

SearchForm.Input = function SearchFormInput({
  className,
  placeholder = "Search...",
  ref,
  ...props
}: SearchFormInputProps) {
  const { inputId, inputValue, setInputValue, size } = useSearchFormContext()
  const styles = searchFormVariants({ size })

  return (
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
      {...props}
    />
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
  const { size } = useSearchFormContext()
  const styles = searchFormVariants({ size })

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
  const { size, clearInput, hasValue, inputValue } = useSearchFormContext()
  const styles = searchFormVariants({ size })

  if (!hasValue) {
    return null
  }

  return (
    <Button
      aria-label={`Clear search: ${inputValue}`}
      className={styles.clearButton({ className })}
      icon={icon}
      onClick={clearInput}
      size="current"
      theme={theme}
      type="button"
      {...props}
    />
  )
}

export { useSearchFormContext, searchFormVariants }

SearchForm.displayName = "SearchForm"
