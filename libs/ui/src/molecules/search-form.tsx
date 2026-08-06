/*
 * SearchForm — @techsio/ui-kit molecule.
 *
 * @component SearchForm
 * @componentVersion v1.0.1
 * @skill search-form-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the search-form-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { createContext, useContext, useEffect, useId, useState } from "react"
import type {
  ComponentPropsWithoutRef,
  ReactNode,
  SubmitEvent,
  Ref,
} from "react"
import { createPortal } from "react-dom"
import type { VariantProps } from "tailwind-variants"

import { ActionIcon } from "../atoms/action-icon"
import type { ActionIconProps } from "../atoms/action-icon"
import { Button as ButtonAtom } from "../atoms/button"
import type { ButtonProps } from "../atoms/button"
import type { IconType } from "../atoms/icon"
import { Input as InputAtom } from "../atoms/input"
import type { InputProps } from "../atoms/input"
import { Label as LabelAtom } from "../atoms/label"
import type { LabelProps } from "../atoms/label"
import { searchFormVariants } from "./search-form-variants"

export { searchFormVariants } from "./search-form-variants"

export type SearchFormSize = "sm" | "md" | "lg"

interface SearchFormContextValue {
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

const useSearchFormContext = () => {
  const context = useContext(SearchFormContext)
  if (context === null) {
    throw new Error("SearchForm components must be used within SearchForm")
  }
  return context
}

export interface SearchFormProps
  extends
    VariantProps<typeof searchFormVariants>,
    Omit<ComponentPropsWithoutRef<"form">, "size"> {
  children: ReactNode
  defaultValue?: string | undefined
  value?: string | undefined
  onValueChange?: ((value: string) => void) | undefined
  ref?: Ref<HTMLFormElement> | undefined
}

interface UseSearchFormStateOptions {
  defaultValue: string
  gapped: boolean
  onSubmit: SearchFormProps["onSubmit"]
  onValueChange: SearchFormProps["onValueChange"]
  size: SearchFormSize
  value: SearchFormProps["value"]
}

const useSearchFormState = ({
  defaultValue,
  gapped,
  onSubmit,
  onValueChange,
  size,
  value,
}: UseSearchFormStateOptions) => {
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

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.(event)
  }

  return {
    contextValue: {
      clearInput,
      clearSlot,
      gapped,
      hasClearButton,
      hasValue: inputValue.length > 0,
      inputId,
      inputValue,
      setClearSlot,
      setHasClearButton,
      setInputValue,
      size,
    } satisfies SearchFormContextValue,
    handleSubmit,
  }
}

export const SearchForm = ({
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
}: SearchFormProps) => {
  const { contextValue, handleSubmit } = useSearchFormState({
    defaultValue,
    gapped,
    onSubmit,
    onValueChange,
    size,
    value,
  })
  const styles = searchFormVariants({ gapped, size })

  return (
    <SearchFormContext.Provider value={contextValue}>
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

type SearchFormLabelProps = Omit<LabelProps, "htmlFor" | "size">

SearchForm.Label = function Label({
  children,
  className,
  ...props
}: SearchFormLabelProps) {
  const { inputId, size } = useSearchFormContext()

  return (
    <LabelAtom className={className} htmlFor={inputId} size={size} {...props}>
      {children}
    </LabelAtom>
  )
}

interface SearchFormControlProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

SearchForm.Control = function Control({
  children,
  className,
  ref,
  ...props
}: SearchFormControlProps) {
  const { size, gapped } = useSearchFormContext()
  const styles = searchFormVariants({ gapped, size })

  return (
    <div className={styles.control({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

type SearchFormInputProps = Omit<
  InputProps,
  "size" | "value" | "onChange" | "withButtonInside"
>

SearchForm.Input = function Input({
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
  const styles = searchFormVariants({ gapped, size })

  return (
    <div className={styles.inputWrapper()} ref={setClearSlot}>
      <InputAtom
        aria-label={props["aria-label"] ?? "Search"}
        className={styles.input({ className })}
        id={inputId}
        onChange={(e) => {
          setInputValue(e.target.value)
        }}
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
  showSearchIcon?: boolean | undefined
}

SearchForm.Button = function Button({
  className,
  children,
  showSearchIcon = false,
  icon,
  iconPosition = "right",
  ...props
}: SearchFormButtonProps) {
  const { size, gapped } = useSearchFormContext()
  const styles = searchFormVariants({ gapped, size })

  // Use provided icon, or search icon if showSearchIcon is true
  const effectiveIcon =
    icon ?? (showSearchIcon ? "token-icon-search" : undefined)

  return (
    <ButtonAtom
      className={styles.button({ className })}
      icon={effectiveIcon}
      iconPosition={iconPosition}
      size={size}
      type="submit"
      {...props}
    >
      {children}
    </ButtonAtom>
  )
}

type SearchFormClearButtonProps = Omit<
  ActionIconProps,
  "size" | "onClick" | "type" | "icon"
> & {
  icon?: IconType | undefined
}

SearchForm.ClearButton = function ClearButton({
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
  } = useSearchFormContext()
  const styles = searchFormVariants({ gapped, size })

  // Tell the input a clear button is composed so it reserves trailing padding.
  useEffect(() => {
    setHasClearButton(true)
    return () => {
      setHasClearButton(false)
    }
  }, [setHasClearButton])

  if (!(hasValue && clearSlot)) {
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
    clearSlot,
  )
}

export { useSearchFormContext }

SearchForm.displayName = "SearchForm"
