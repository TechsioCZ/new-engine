/*
 * PhoneInput — @techsio/ui-kit molecule.
 *
 * @component PhoneInput
 * @componentVersion v1.0.2
 * @skill phone-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the phone-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max"
import type { CountryCode } from "libphonenumber-js/max"
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import type {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  ReactNode,
  Ref,
} from "react"
import type { VariantProps } from "tailwind-variants"

import type { IconProps } from "../atoms/icon"
import { Input as InputPrimitive } from "../atoms/input"
import type { InputProps } from "../atoms/input"
import { Label as LabelPrimitive } from "../atoms/label"
import type { LabelProps } from "../atoms/label"
import { StatusText as StatusTextPrimitive } from "../atoms/status-text"
import { tv } from "../utils"
import {
  defaultPhoneInputCountries,
  formatPhoneInputValue,
  getPhoneCountryCallingCode,
  getPhoneInputValueDetailsInternal,
  isCountryAvailable,
} from "./phone-input-public"
import type {
  PhoneInputCountry,
  PhoneInputValueChangeDetails,
} from "./phone-input-public"
import { Select } from "./select"

export {
  defaultPhoneInputCountries,
  formatPhoneInputValue,
  getPhoneInputValueDetails,
} from "./phone-input-public"
export type {
  PhoneInputCountry,
  PhoneInputValueChangeDetails,
} from "./phone-input-public"

export type PhoneInputSize = "sm" | "md" | "lg"
export type PhoneInputValidateStatus =
  | "default"
  | "error"
  | "success"
  | "warning"

export type PhoneInputCountryChangeDetails = PhoneInputValueChangeDetails & {
  countryItem: PhoneInputCountry
}

const defaultNativeValidationMessage = "Enter a valid phone number."

const phoneInputVariants = tv({
  defaultVariants: {
    size: "md",
  },
  slots: {
    control: [
      "form-control-base",
      "relative flex w-full items-center overflow-hidden",
      "text-phone-input-fg",
      "hover:border-phone-input-border-hover hover:bg-phone-input-bg-hover",
      "phone-input-focus",
      "data-[disabled]:cursor-not-allowed",
      "data-[disabled]:border-phone-input-border-disabled",
      "data-[disabled]:bg-phone-input-bg-disabled",
      "data-[disabled]:text-phone-input-fg-disabled",
      "data-[validation=error]:border-(length:--border-width-validation)",
      "data-[validation=error]:border-phone-input-border-danger data-[validation=error]:outline-phone-input-border-danger",
      "data-[validation=error]:outline-(length:--default-ring-width) data-[validation=error]:outline-(style:--default-ring-style)",
      "data-[validation=error]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=success]:border-(length:--border-width-validation)",
      "data-[validation=success]:border-phone-input-border-success data-[validation=success]:outline-phone-input-border-success",
      "data-[validation=success]:outline-(length:--default-ring-width) data-[validation=success]:outline-(style:--default-ring-style)",
      "data-[validation=success]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=warning]:border-(length:--border-width-validation)",
      "data-[validation=warning]:border-phone-input-border-warning data-[validation=warning]:outline-phone-input-border-warning",
      "data-[validation=warning]:outline-(length:--default-ring-width) data-[validation=warning]:outline-(style:--default-ring-style)",
      "data-[validation=warning]:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    countryCallingCode: [
      "font-medium text-phone-input-country-calling-code-fg",
    ],
    countryFlag: [
      "inline-flex min-w-phone-input-country-flag items-center justify-center",
      "rounded-phone-input-country-flag",
      "text-phone-input-country-flag font-medium uppercase",
    ],
    countrySelectControl: ["h-full w-auto shrink-0"],
    countrySelectRoot: ["contents"],
    countryTrigger: [
      "shrink-0",
      "bg-phone-input-trigger-bg-base",
      "hover:bg-phone-input-trigger-bg-hover",
      "border-(length:--border-phone-input-trigger)",
      "focus-visible:outline-none",
      "w-phone-input-trigger",
      "focus-visible:bg-phone-input-trigger-bg-hover",
      // Sits flush against the input: round only the leading (left) corners to
      // match the control; keep the trailing (right) edge square so the hover
      // fill meets the input with no rounded notch.
      "rounded-e-none",
    ],
    countryValue: ["flex items-center gap-phone-input-country-value"],
    input: [
      "min-w-0 flex-1 border-0",
      "bg-phone-input-input-bg-base",
      "text-phone-input-fg",
      "placeholder:text-phone-input-fg-placeholder",
      "hover:bg-phone-input-input-bg-hover",
      "focus:bg-phone-input-input-bg-focus",
      "focus-visible:outline-none",
      "disabled:text-phone-input-fg-disabled",
    ],
    itemContent: ["flex min-w-0 items-center gap-phone-input-item"],
    itemMeta: ["shrink-0 text-phone-input-item-meta-fg"],
    root: ["relative flex w-full flex-col gap-phone-input"],
  },
  variants: {
    size: {
      lg: {
        control: "h-form-control-lg rounded-phone-input-lg text-phone-input-lg",
        input: "text-phone-input-lg",
      },
      md: {
        control: "h-form-control-md rounded-phone-input-md text-phone-input-md",
        input: "text-phone-input-md",
      },
      sm: {
        control: "h-form-control-sm rounded-phone-input-sm text-phone-input-sm",
        input: "text-phone-input-sm",
      },
    },
  },
})

interface PhoneInputContextValue {
  countries: PhoneInputCountry[]
  selectedCountry: CountryCode
  selectedCountryItem: PhoneInputCountry
  setCountryValue: (country: CountryCode) => void
  countryName?: string | undefined
  form?: string | undefined
  size: PhoneInputSize
  inputId: string
  inputValue: string
  setInputValue: (value: string) => void
  details: PhoneInputValueChangeDetails
  disabled: boolean
  nativeValidation: boolean
  nativeValidationMessage: string
  readOnly: boolean
  required: boolean
  validateStatus: PhoneInputValidateStatus
}

const assignRef = <T,>(ref: Ref<T> | undefined, value: T | null): void => {
  if (!ref) {
    return
  }

  if (typeof ref === "function") {
    ref(value)
    return
  }

  ref.current = value
}

const renderCountryFlag = (item: PhoneInputCountry): ReactNode =>
  item.flag ?? item.value

const getCountryDisplayValue = (item: PhoneInputCountry): string => {
  if (item.displayValue !== undefined && item.displayValue !== "") {
    return item.displayValue
  }

  if (item.name !== undefined && item.name !== "") {
    return item.name
  }

  return typeof item.label === "string" ? item.label : item.value
}

const normalizePhoneInputCountries = (
  countries: PhoneInputCountry[],
): PhoneInputCountry[] =>
  countries.map((item) => {
    const displayValue = getCountryDisplayValue(item)

    if (item.displayValue === displayValue) {
      return item
    }

    return {
      ...item,
      displayValue,
    }
  })

const getCountryFromValue = (
  value: string,
  countries: PhoneInputCountry[],
): CountryCode | undefined => {
  const parsedCountry = parsePhoneNumberFromString(value)?.country

  return parsedCountry !== undefined &&
    isCountryAvailable(countries, parsedCountry)
    ? parsedCountry
    : undefined
}

const getInitialCountry = (
  value: string,
  defaultCountry: CountryCode,
  countries: PhoneInputCountry[],
): CountryCode => getCountryFromValue(value, countries) ?? defaultCountry

const resolveCountry = (
  countries: PhoneInputCountry[],
  country: CountryCode,
): CountryCode => {
  const supportedCountry = isSupportedCountry(country) ? country : "SK"

  if (isCountryAvailable(countries, supportedCountry)) {
    return supportedCountry
  }

  return countries.find((item) => item.disabled !== true)?.value ?? "SK"
}

const getCountryItem = (
  countries: PhoneInputCountry[],
  country: CountryCode,
): PhoneInputCountry =>
  countries.find((item) => item.value === country) ?? {
    label: country,
    name: country,
    value: country,
  }

const getAvailablePhoneInputCountries = (
  countries: PhoneInputCountry[],
): PhoneInputCountry[] =>
  normalizePhoneInputCountries(
    countries.length > 0 ? countries : defaultPhoneInputCountries,
  )

const createPhoneInputContextValue = (
  value: PhoneInputContextValue,
): PhoneInputContextValue => value

const createPhoneInputItemContextValue = (
  item: PhoneInputCountry,
): PhoneInputItemContextValue => ({ item })

const PhoneInputContext = createContext<PhoneInputContextValue | null>(null)

export const usePhoneInputContext = (): PhoneInputContextValue => {
  const context = useContext(PhoneInputContext)
  if (!context) {
    throw new Error("PhoneInput components must be used within PhoneInput")
  }
  return context
}

interface PhoneInputItemContextValue {
  item: PhoneInputCountry
}

const PhoneInputItemContext = createContext<PhoneInputItemContextValue | null>(
  null,
)

const usePhoneInputItemContext = (): PhoneInputItemContextValue => {
  const context = useContext(PhoneInputItemContext)
  if (!context) {
    throw new Error(
      "PhoneInput item components must be used within PhoneInput.Item",
    )
  }
  return context
}

export type PhoneInputProps = VariantProps<typeof phoneInputVariants> &
  Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> & {
    countries?: PhoneInputCountry[] | undefined
    value?: string | undefined
    defaultValue?: string | undefined
    country?: CountryCode | undefined
    defaultCountry?: CountryCode | undefined
    name?: string | undefined
    countryName?: string | undefined
    form?: string | undefined
    required?: boolean | undefined
    disabled?: boolean | undefined
    readOnly?: boolean | undefined
    nativeValidation?: boolean | undefined
    nativeValidationMessage?: string | undefined
    validateStatus?: PhoneInputValidateStatus | undefined
    onValueChange?:
      | ((details: PhoneInputValueChangeDetails) => void)
      | undefined
    onCountryChange?:
      | ((details: PhoneInputCountryChangeDetails) => void)
      | undefined
    ref?: Ref<HTMLDivElement> | undefined
  }

const getSelectedPhoneCountry = (
  countries: PhoneInputCountry[],
  country: CountryCode | undefined,
  value: string | undefined,
  internalCountry: CountryCode,
): CountryCode => {
  const valueCountry =
    value === undefined ? undefined : getCountryFromValue(value, countries)
  return resolveCountry(countries, country ?? valueCountry ?? internalCountry)
}

const getDisplayedPhoneValue = (
  value: string | undefined,
  internalValue: string,
  country: CountryCode,
): string =>
  value === undefined ? internalValue : formatPhoneInputValue(value, country)

const updatePhoneInputState = (
  nextDetails: PhoneInputValueChangeDetails,
  options: {
    updateCountry: boolean
    updateValue: boolean
    setCountry: (country: CountryCode) => void
    setValue: (value: string) => void
  },
): void => {
  if (options.updateCountry) {
    options.setCountry(nextDetails.country)
  }

  if (options.updateValue) {
    options.setValue(nextDetails.value)
  }
}

const notifyPhoneInputChanges = (
  nextDetails: PhoneInputValueChangeDetails,
  countries: PhoneInputCountry[],
  countryChanged: boolean,
  onCountryChange: PhoneInputProps["onCountryChange"],
  onValueChange: PhoneInputProps["onValueChange"],
): void => {
  if (countryChanged) {
    onCountryChange?.({
      ...nextDetails,
      countryItem: getCountryItem(countries, nextDetails.country),
    })
  }

  onValueChange?.(nextDetails)
}

const PhoneInputRoot = ({
  countries: countriesProp = defaultPhoneInputCountries,
  value,
  defaultValue = "",
  country,
  defaultCountry = "CZ",
  name,
  countryName,
  form,
  required = false,
  disabled = false,
  readOnly = false,
  nativeValidation = false,
  nativeValidationMessage = defaultNativeValidationMessage,
  validateStatus = "default",
  onValueChange,
  onCountryChange,
  size = "md",
  id: providedId,
  className,
  children,
  ref,
  ...props
}: PhoneInputProps) => {
  const generatedId = useId()
  const id =
    providedId === undefined || providedId === "" ? generatedId : providedId
  const countries = getAvailablePhoneInputCountries(countriesProp)
  const fallbackCountry = resolveCountry(
    countries,
    getInitialCountry(value ?? defaultValue, defaultCountry, countries),
  )

  const [internalCountry, setInternalCountry] =
    useState<CountryCode>(fallbackCountry)
  const selectedCountry = getSelectedPhoneCountry(
    countries,
    country,
    value,
    internalCountry,
  )
  const selectedCountryItem = getCountryItem(countries, selectedCountry)

  const [internalValue, setInternalValue] = useState(() =>
    formatPhoneInputValue(defaultValue, selectedCountry),
  )
  const isValueControlled = value !== undefined
  const inputValue = getDisplayedPhoneValue(
    value,
    internalValue,
    selectedCountry,
  )

  const details = getPhoneInputValueDetailsInternal(
    inputValue,
    selectedCountry,
    { countries },
  )
  const nativeFormValue = details.isValid ? details.e164 : inputValue

  const setInputValue = (nextValue: string) => {
    const nextDetails = getPhoneInputValueDetailsInternal(
      nextValue,
      selectedCountry,
      {
        countries,
        syncCountryFromValue: true,
      },
    )
    const didChangeCountry = nextDetails.country !== selectedCountry

    updatePhoneInputState(nextDetails, {
      setCountry: setInternalCountry,
      setValue: setInternalValue,
      updateCountry: didChangeCountry && country === undefined,
      updateValue: !isValueControlled,
    })
    notifyPhoneInputChanges(
      nextDetails,
      countries,
      didChangeCountry,
      onCountryChange,
      onValueChange,
    )
  }

  const setCountryValue = (nextCountry: CountryCode) => {
    const nextDetails = getPhoneInputValueDetailsInternal(
      inputValue,
      nextCountry,
      {
        countries,
      },
    )

    updatePhoneInputState(nextDetails, {
      setCountry: setInternalCountry,
      setValue: setInternalValue,
      updateCountry: country === undefined,
      updateValue: !isValueControlled,
    })
    notifyPhoneInputChanges(
      nextDetails,
      countries,
      true,
      onCountryChange,
      onValueChange,
    )
  }

  const styles = phoneInputVariants({ size })
  const contextValue = createPhoneInputContextValue({
    countries,
    countryName,
    details,
    disabled,
    form,
    inputId: `${id}-input`,
    inputValue,
    nativeValidation,
    nativeValidationMessage,
    readOnly,
    required,
    selectedCountry,
    selectedCountryItem,
    setCountryValue,
    setInputValue,
    size,
    validateStatus,
  })

  return (
    <PhoneInputContext.Provider value={contextValue}>
      {name !== undefined && name !== "" && (
        <input
          disabled={disabled}
          form={form}
          name={name}
          type="hidden"
          value={nativeFormValue}
        />
      )}
      <div
        className={styles.root({ className })}
        data-disabled={disabled || undefined}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    </PhoneInputContext.Provider>
  )
}

type PhoneInputLabelProps = Omit<LabelProps, "htmlFor" | "size">

const PhoneInputLabel = ({ children, ...props }: PhoneInputLabelProps) => {
  const { disabled, inputId, required, size } = usePhoneInputContext()

  return (
    <LabelPrimitive
      disabled={disabled}
      htmlFor={inputId}
      required={required}
      size={size}
      {...props}
    >
      {children}
    </LabelPrimitive>
  )
}

type PhoneInputControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

const PhoneInputControl = ({
  children,
  className,
  ref,
  ...props
}: PhoneInputControlProps) => {
  const { disabled, readOnly, size, validateStatus } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })
  const validationDataAttrs =
    validateStatus === "default" ? {} : { "data-validation": validateStatus }

  return (
    <div
      className={styles.control({ className })}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      ref={ref}
      {...validationDataAttrs}
      {...props}
    >
      {children}
    </div>
  )
}

interface PhoneInputCountrySelectProps {
  children: ReactNode
  className?: string | undefined
  closeOnSelect?: boolean | undefined
}

const PhoneInputCountrySelect = ({
  children,
  className,
  closeOnSelect = true,
}: PhoneInputCountrySelectProps) => {
  const {
    countries,
    countryName,
    disabled,
    form,
    readOnly,
    selectedCountry,
    setCountryValue,
    size,
  } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <Select
      className={styles.countrySelectRoot({ className })}
      closeOnSelect={closeOnSelect}
      disabled={disabled}
      form={form}
      items={countries}
      name={countryName}
      onValueChange={(selectDetails) => {
        const [nextCountry] = selectDetails.value
        if (
          nextCountry !== undefined &&
          nextCountry !== "" &&
          isSupportedCountry(nextCountry)
        ) {
          setCountryValue(nextCountry)
        }
      }}
      readOnly={readOnly}
      size={size}
      value={[selectedCountry]}
    >
      {children}
    </Select>
  )
}

type PhoneInputCountryControlProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

const PhoneInputCountryControl = ({
  children,
  className,
  ref,
  ...props
}: PhoneInputCountryControlProps) => {
  const { size } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <Select.Control
      className={styles.countrySelectControl({ className })}
      ref={ref}
      {...props}
    >
      {children}
    </Select.Control>
  )
}

type PhoneInputCountryValueProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

const PhoneInputCountryValue = ({
  children,
  className,
  ref,
  ...props
}: PhoneInputCountryValueProps) => {
  const { size } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <span className={styles.countryValue({ className })} ref={ref} {...props}>
      {children}
    </span>
  )
}

type PhoneInputCountryFlagProps = ComponentPropsWithoutRef<"span"> & {
  item?: PhoneInputCountry | undefined
  ref?: Ref<HTMLSpanElement> | undefined
}

const PhoneInputCountryFlag = ({
  item,
  className,
  ref,
  ...props
}: PhoneInputCountryFlagProps) => {
  const { selectedCountryItem, size } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <span className={styles.countryFlag({ className })} ref={ref} {...props}>
      {renderCountryFlag(item ?? selectedCountryItem)}
    </span>
  )
}

type PhoneInputCountryCallingCodeProps = ComponentPropsWithoutRef<"span"> & {
  item?: PhoneInputCountry | undefined
  ref?: Ref<HTMLSpanElement> | undefined
}

const PhoneInputCountryCallingCode = ({
  item,
  className,
  ref,
  ...props
}: PhoneInputCountryCallingCodeProps) => {
  const { selectedCountryItem, size } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <span
      className={styles.countryCallingCode({ className })}
      ref={ref}
      {...props}
    >
      +{getPhoneCountryCallingCode(item ?? selectedCountryItem)}
    </span>
  )
}

type PhoneInputCountryTriggerProps = ComponentPropsWithoutRef<"button"> & {
  iconSize?: IconProps["size"] | undefined
  ref?: Ref<HTMLButtonElement> | undefined
}

const PhoneInputCountryTrigger = ({
  children,
  className,
  ref,
  ...props
}: PhoneInputCountryTriggerProps) => {
  const { selectedCountryItem, size } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <Select.Trigger
      className={styles.countryTrigger({ className })}
      ref={ref}
      {...props}
    >
      {children ?? (
        <PhoneInputCountryValue>
          <PhoneInputCountryFlag item={selectedCountryItem} />
          <PhoneInputCountryCallingCode item={selectedCountryItem} />
        </PhoneInputCountryValue>
      )}
    </Select.Trigger>
  )
}

type PhoneInputInputProps = Omit<
  InputProps,
  | "aria-invalid"
  | "defaultValue"
  | "disabled"
  | "form"
  | "id"
  | "inputMode"
  | "name"
  | "onChange"
  | "readOnly"
  | "required"
  | "size"
  | "type"
  | "value"
  | "variant"
> & {
  onChange?: ChangeEventHandler<HTMLInputElement> | undefined
}

const PhoneInputInput = ({
  className,
  onChange,
  placeholder = "Phone number",
  ref,
  ...props
}: PhoneInputInputProps) => {
  const {
    details,
    disabled,
    form,
    inputId,
    inputValue,
    nativeValidation,
    nativeValidationMessage,
    readOnly,
    required,
    setInputValue,
    size,
    validateStatus,
  } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })
  const inputRef = useRef<HTMLInputElement>(null)
  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node
    assignRef(ref, node)
  }

  const hasInputValue = inputValue.trim() !== ""
  const canUseNativeValidation = nativeValidation && !disabled && !readOnly
  const hasNativeValidationError =
    canUseNativeValidation && hasInputValue && !details.isValid

  useEffect(() => {
    const input = inputRef.current

    if (input === null) {
      return
    }

    input.setCustomValidity(
      hasNativeValidationError ? nativeValidationMessage : "",
    )
  }, [hasNativeValidationError, nativeValidationMessage])

  return (
    <InputPrimitive
      {...props}
      aria-invalid={
        validateStatus === "error" || hasNativeValidationError || undefined
      }
      className={styles.input({ className })}
      disabled={disabled}
      form={form}
      id={inputId}
      inputMode="tel"
      name={undefined}
      onChange={(event) => {
        setInputValue(event.target.value)
        onChange?.(event)
      }}
      placeholder={placeholder}
      readOnly={readOnly}
      ref={setInputRef}
      required={required}
      size={size}
      type="tel"
      value={inputValue}
    />
  )
}

type PhoneInputCountryPositionerProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement> | undefined
}

const PhoneInputCountryPositioner = ({
  children,
  ...props
}: PhoneInputCountryPositionerProps) => (
  <Select.Positioner {...props}>{children}</Select.Positioner>
)

type PhoneInputCountryContentProps = ComponentPropsWithoutRef<"ul"> & {
  ref?: Ref<HTMLUListElement> | undefined
}

const PhoneInputCountryContent = ({
  children,
  ...props
}: PhoneInputCountryContentProps) => (
  <Select.Content {...props}>{children}</Select.Content>
)

type PhoneInputCountryItemProps = ComponentPropsWithoutRef<"li"> & {
  item: PhoneInputCountry
  ref?: Ref<HTMLLIElement> | undefined
}

const PhoneInputCountryItem = ({
  item,
  children,
  ...props
}: PhoneInputCountryItemProps) => {
  const contextValue = createPhoneInputItemContextValue(item)

  return (
    <PhoneInputItemContext.Provider value={contextValue}>
      <Select.Item item={item} {...props}>
        {children}
      </Select.Item>
    </PhoneInputItemContext.Provider>
  )
}

type PhoneInputCountryItemTextProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

const PhoneInputCountryItemText = ({
  children,
  ...props
}: PhoneInputCountryItemTextProps) => {
  const { size } = usePhoneInputContext()
  const { item } = usePhoneInputItemContext()
  const styles = phoneInputVariants({ size })

  return (
    <Select.ItemText {...props}>
      {children ?? (
        <span className={styles.itemContent()}>
          <PhoneInputCountryFlag item={item} />
          <span className="truncate">{item.label}</span>
        </span>
      )}
    </Select.ItemText>
  )
}

type PhoneInputCountryItemMetaProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement> | undefined
}

const PhoneInputCountryItemMeta = ({
  children,
  className,
  ref,
  ...props
}: PhoneInputCountryItemMetaProps) => {
  const { size } = usePhoneInputContext()
  const { item } = usePhoneInputItemContext()
  const styles = phoneInputVariants({ size })

  return (
    <span className={styles.itemMeta({ className })} ref={ref} {...props}>
      {children ?? `+${getPhoneCountryCallingCode(item)}`}
    </span>
  )
}

type PhoneInputCountryItemIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  iconSize?: IconProps["size"] | undefined
  ref?: Ref<HTMLSpanElement> | undefined
}

const PhoneInputCountryItemIndicator = (
  props: PhoneInputCountryItemIndicatorProps,
) => <Select.ItemIndicator {...props} />

interface PhoneInputCountryPickerProps {
  className?: string | undefined
  selectProps?: Omit<PhoneInputCountrySelectProps, "children"> | undefined
  controlProps?: PhoneInputCountryControlProps | undefined
  triggerProps?: PhoneInputCountryTriggerProps | undefined
  positionerProps?: PhoneInputCountryPositionerProps | undefined
  contentProps?: PhoneInputCountryContentProps | undefined
}

const PhoneInputCountryPicker = ({
  className,
  selectProps,
  controlProps,
  triggerProps,
  positionerProps,
  contentProps,
}: PhoneInputCountryPickerProps) => {
  const { countries } = usePhoneInputContext()

  return (
    <PhoneInputCountrySelect
      {...selectProps}
      className={selectProps?.className ?? className}
    >
      <PhoneInputCountryControl {...controlProps}>
        <PhoneInputCountryTrigger {...triggerProps} />
      </PhoneInputCountryControl>
      <PhoneInputCountryPositioner {...positionerProps}>
        <PhoneInputCountryContent {...contentProps}>
          {countries.map((item) => (
            <PhoneInputCountryItem item={item} key={item.value}>
              <PhoneInputCountryItemText />
              <PhoneInputCountryItemMeta />
            </PhoneInputCountryItem>
          ))}
        </PhoneInputCountryContent>
      </PhoneInputCountryPositioner>
    </PhoneInputCountrySelect>
  )
}

type PhoneInputStatusTextProps = ComponentPropsWithoutRef<"div"> & {
  status?: PhoneInputValidateStatus | undefined
  showIcon?: boolean | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

const PhoneInputStatusText = ({
  status,
  showIcon,
  children,
  ...props
}: PhoneInputStatusTextProps) => {
  const { size, validateStatus } = usePhoneInputContext()

  return (
    <StatusTextPrimitive
      showIcon={showIcon}
      size={size}
      status={status ?? validateStatus}
      {...props}
    >
      {children}
    </StatusTextPrimitive>
  )
}
PhoneInputRoot.displayName = "PhoneInput"

const PhoneInputCompound = Object.assign(PhoneInputRoot, {
  Content: PhoneInputCountryContent,
  Control: PhoneInputControl,
  CountryCallingCode: PhoneInputCountryCallingCode,
  CountryContent: PhoneInputCountryContent,
  CountryControl: PhoneInputCountryControl,
  CountryFlag: PhoneInputCountryFlag,
  CountryItem: PhoneInputCountryItem,
  CountryItemIndicator: PhoneInputCountryItemIndicator,
  CountryItemMeta: PhoneInputCountryItemMeta,
  CountryItemText: PhoneInputCountryItemText,
  CountryPicker: PhoneInputCountryPicker,
  CountryPositioner: PhoneInputCountryPositioner,
  CountrySelect: PhoneInputCountrySelect,
  CountryTrigger: PhoneInputCountryTrigger,
  CountryValue: PhoneInputCountryValue,
  Input: PhoneInputInput,
  Item: PhoneInputCountryItem,
  ItemIndicator: PhoneInputCountryItemIndicator,
  ItemMeta: PhoneInputCountryItemMeta,
  ItemText: PhoneInputCountryItemText,
  Label: PhoneInputLabel,
  Positioner: PhoneInputCountryPositioner,
  StatusText: PhoneInputStatusText,
})

export const PhoneInput = PhoneInputCompound
