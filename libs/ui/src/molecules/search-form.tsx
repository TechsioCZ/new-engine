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
    // Layout-only wrapper. The input and button are composed side by side and
    // each keep their own border, background, radius, and focus ring so they
    // focus independently instead of sharing one ring around the whole group.
    root: ["relative grid"],
    control: ["flex items-stretch"],
    // The input keeps its own styling/focus ring from the Input atom.
    input: ["peer", "min-w-0 flex-1"],
    // The button keeps its own styling/focus ring from the Button atom.
    button: ["shrink-0"],
    // Radius is left to the gapped variant so it stays consistent with the
    // input and button, which also manage their own corners per gapped state.
    clearButton: ["shrink-0 self-stretch"],
  },
  variants: {
    size: {
      // Pin the button to the shared form-control height so it always matches
      // the input height — including `lg`, which the Button atom sizes by
      // padding alone.
      sm: { root: "gap-search-form-sm", button: "h-form-control-sm" },
      md: { root: "gap-search-form-md", button: "h-form-control-md" },
      lg: { root: "gap-search-form-lg", button: "h-form-control-lg" },
    },
    gapped: {
      // Joined: strip the touching corners so the two controls read as one.
      // The clear button sits between them, so it stays square too.
      false: {
        input: "rounded-e-none",
        button: "rounded-s-none",
        clearButton: "rounded-none",
      },
      // Detached: 8px gap and the controls keep their full rounded corners,
      // including the clear button (radius managed by the Button atom).
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
  extends Omit<InputProps, "size" | "value" | "onChange"> {}

SearchForm.Input = function SearchFormInput({
  className,
  placeholder = "Search...",
  ref,
  ...props
}: SearchFormInputProps) {
  const { inputId, inputValue, setInputValue, size, gapped } =
    useSearchFormContext()
  const styles = searchFormVariants({ size, gapped })

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
  const { size, gapped, clearInput, hasValue, inputValue } =
    useSearchFormContext()
  const styles = searchFormVariants({ size, gapped })

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
