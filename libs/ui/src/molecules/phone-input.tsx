import {
  AsYouType,
  type CountryCode,
  type E164Number,
  formatIncompletePhoneNumber,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from "libphonenumber-js"
import {
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useContext,
  useId,
  useMemo,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import type { IconProps } from "../atoms/icon"
import { Input, type InputProps } from "../atoms/input"
import { Label, type LabelProps } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"
import { Select } from "./select"

export type PhoneInputSize = "sm" | "md" | "lg"
export type PhoneInputValidateStatus =
  | "default"
  | "error"
  | "success"
  | "warning"

export type PhoneInputCountry = {
  value: CountryCode
  label: ReactNode
  disabled?: boolean
  displayValue?: string
  name?: string
  flag?: ReactNode
  callingCode?: string
  [key: string]: unknown
}

export type PhoneInputValueChangeDetails = {
  value: string
  e164: E164Number | ""
  country: CountryCode
  callingCode: string
  nationalNumber: string
  isPossible: boolean
  isValid: boolean
}

export type PhoneInputCountryChangeDetails = PhoneInputValueChangeDetails & {
  countryItem: PhoneInputCountry
}

export const defaultPhoneInputCountries: PhoneInputCountry[] = [
  { value: "SK", label: "Slovakia", name: "Slovakia" },
  { value: "CZ", label: "Czechia", name: "Czechia" },
  { value: "HU", label: "Hungary", name: "Hungary" },
  { value: "RO", label: "Romania", name: "Romania" },
  { value: "PL", label: "Poland", name: "Poland" },
  { value: "AT", label: "Austria", name: "Austria" },
  { value: "DE", label: "Germany", name: "Germany" },
]

const phoneInputVariants = tv({
  slots: {
    root: ["relative flex w-full flex-col gap-phone-input-root"],
    control: [
      "form-control-base",
      "relative flex w-full items-center overflow-hidden",
      "text-phone-input-fg",
      "hover:border-phone-input-border-hover hover:bg-phone-input-bg-hover",
      "focus-within:border-phone-input-border-focus focus-within:bg-phone-input-bg-focus",
      "focus-within:outline-(style:--default-ring-style) focus-within:outline-(length:--default-ring-width)",
      "focus-within:outline-phone-input-ring",
      "focus-within:outline-offset-(length:--default-ring-offset)",
      "data-[disabled]:cursor-not-allowed",
      "data-[disabled]:border-phone-input-border-disabled",
      "data-[disabled]:bg-phone-input-bg-disabled",
      "data-[disabled]:text-phone-input-fg-disabled",
      "data-[validation=error]:border-(length:--border-width-validation)",
      "data-[validation=error]:border-phone-input-danger data-[validation=error]:outline-phone-input-danger",
      "data-[validation=error]:outline-(style:--default-ring-style) data-[validation=error]:outline-(length:--default-ring-width)",
      "data-[validation=error]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=success]:border-(length:--border-width-validation)",
      "data-[validation=success]:border-phone-input-success data-[validation=success]:outline-phone-input-success",
      "data-[validation=success]:outline-(style:--default-ring-style) data-[validation=success]:outline-(length:--default-ring-width)",
      "data-[validation=success]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=warning]:border-(length:--border-width-validation)",
      "data-[validation=warning]:border-phone-input-warning data-[validation=warning]:outline-phone-input-warning",
      "data-[validation=warning]:outline-(style:--default-ring-style) data-[validation=warning]:outline-(length:--default-ring-width)",
      "data-[validation=warning]:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    countrySelectRoot: ["contents"],
    countrySelectControl: ["h-full w-auto shrink-0"],
    countryTrigger: [
      "!h-full !w-auto !rounded-none !border-0 !bg-transparent shrink-0 border-phone-input-divider border-r",
      "!px-phone-input-country-trigger !py-0",
      "!text-phone-input-country-trigger",
      "hover:!bg-transparent focus-visible:!outline-none",
      "disabled:!text-phone-input-fg-disabled",
    ],
    countryValue: ["flex items-center gap-phone-input-country-value"],
    countryFlag: [
      "inline-flex min-w-phone-input-country-flag items-center justify-center",
      "rounded-phone-input-country-flag p-phone-input-country-flag",
      "font-medium text-phone-input-country-flag uppercase",
    ],
    countryCallingCode: ["font-medium text-phone-input-country-calling-code"],
    input: [
      "min-w-0 flex-1 border-0 bg-transparent",
      "px-phone-input-input py-0",
      "text-phone-input-fg",
      "placeholder:text-phone-input-placeholder",
      "hover:border-transparent hover:bg-transparent",
      "focus:border-transparent focus:bg-transparent",
      "focus-visible:outline-none",
      "disabled:bg-transparent disabled:text-phone-input-fg-disabled",
    ],
    itemContent: ["flex min-w-0 items-center gap-phone-input-item"],
    itemMeta: ["shrink-0 text-select-item-fg"],
  },
  variants: {
    size: {
      sm: {
        control: "h-form-control-sm rounded-phone-input-sm text-phone-input-sm",
        input: "h-full text-phone-input-sm",
      },
      md: {
        control: "h-form-control-md rounded-phone-input-md text-phone-input-md",
        input: "h-full text-phone-input-md",
      },
      lg: {
        control: "h-form-control-lg rounded-phone-input-lg text-phone-input-lg",
        input: "h-full text-phone-input-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

type PhoneInputContextValue = {
  countries: PhoneInputCountry[]
  selectedCountry: CountryCode
  selectedCountryItem: PhoneInputCountry
  setCountryValue: (country: CountryCode) => void
  countryName?: string
  form?: string
  size: PhoneInputSize
  inputId: string
  inputValue: string
  setInputValue: (value: string) => void
  details: PhoneInputValueChangeDetails
  disabled: boolean
  readOnly: boolean
  required: boolean
  validateStatus: PhoneInputValidateStatus
}

const PhoneInputContext = createContext<PhoneInputContextValue | null>(null)

function usePhoneInputContext() {
  const context = useContext(PhoneInputContext)
  if (!context) {
    throw new Error("PhoneInput components must be used within PhoneInput")
  }
  return context
}

type PhoneInputItemContextValue = {
  item: PhoneInputCountry
}

const PhoneInputItemContext = createContext<PhoneInputItemContextValue | null>(
  null
)

function usePhoneInputItemContext() {
  const context = useContext(PhoneInputItemContext)
  if (!context) {
    throw new Error(
      "PhoneInput item components must be used within PhoneInput.Item"
    )
  }
  return context
}

export interface PhoneInputProps
  extends VariantProps<typeof phoneInputVariants>,
    Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> {
  countries?: PhoneInputCountry[]
  value?: string
  defaultValue?: string
  country?: CountryCode
  defaultCountry?: CountryCode
  name?: string
  countryName?: string
  form?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  validateStatus?: PhoneInputValidateStatus
  onValueChange?: (details: PhoneInputValueChangeDetails) => void
  onCountryChange?: (details: PhoneInputCountryChangeDetails) => void
  ref?: Ref<HTMLDivElement>
}

export function PhoneInput({
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
  validateStatus = "default",
  onValueChange,
  onCountryChange,
  size = "md",
  id: providedId,
  className,
  children,
  ref,
  ...props
}: PhoneInputProps) {
  const generatedId = useId()
  const id = providedId || generatedId
  const countries =
    countriesProp.length > 0 ? countriesProp : defaultPhoneInputCountries
  const fallbackCountry = resolveCountry(countries, defaultCountry)

  const [internalCountry, setInternalCountry] =
    useState<CountryCode>(fallbackCountry)
  const selectedCountry = resolveCountry(countries, country ?? internalCountry)
  const selectedCountryItem = getCountryItem(countries, selectedCountry)

  const [internalValue, setInternalValue] = useState(() =>
    formatPhoneInputValue(defaultValue, selectedCountry)
  )
  const isValueControlled = value !== undefined
  const inputValue = isValueControlled
    ? formatPhoneInputValue(value, selectedCountry)
    : internalValue

  const details = useMemo(
    () => getPhoneInputValueDetails(inputValue, selectedCountry),
    [inputValue, selectedCountry]
  )

  const setInputValue = (nextValue: string) => {
    const nextDetails = getPhoneInputValueDetails(nextValue, selectedCountry)

    if (!isValueControlled) {
      setInternalValue(nextDetails.value)
    }

    onValueChange?.(nextDetails)
  }

  const setCountryValue = (nextCountry: CountryCode) => {
    const nextCountryItem = getCountryItem(countries, nextCountry)
    const nextDetails = getPhoneInputValueDetails(inputValue, nextCountry)

    if (!country) {
      setInternalCountry(nextCountry)
    }

    if (!isValueControlled) {
      setInternalValue(nextDetails.value)
    }

    onCountryChange?.({
      ...nextDetails,
      countryItem: nextCountryItem,
    })
    onValueChange?.(nextDetails)
  }

  const styles = phoneInputVariants({ size })

  return (
    <PhoneInputContext.Provider
      value={{
        countries,
        selectedCountry,
        selectedCountryItem,
        setCountryValue,
        countryName,
        form,
        size,
        inputId: `${id}-input`,
        inputValue,
        setInputValue,
        details,
        disabled,
        readOnly,
        required,
        validateStatus,
      }}
    >
      {name && (
        <input form={form} name={name} type="hidden" value={details.e164} />
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

interface PhoneInputLabelProps extends Omit<LabelProps, "htmlFor" | "size"> {}

PhoneInput.Label = function PhoneInputLabel({
  children,
  ...props
}: PhoneInputLabelProps) {
  const { disabled, inputId, required, size } = usePhoneInputContext()

  return (
    <Label
      disabled={disabled}
      htmlFor={inputId}
      required={required}
      size={size}
      {...props}
    >
      {children}
    </Label>
  )
}

interface PhoneInputControlProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>
}

PhoneInput.Control = function PhoneInputControl({
  children,
  className,
  ref,
  ...props
}: PhoneInputControlProps) {
  const { disabled, readOnly, size, validateStatus } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })
  const validationDataAttrs =
    validateStatus !== "default" ? { "data-validation": validateStatus } : {}

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

type PhoneInputCountrySelectProps = {
  children: ReactNode
  className?: string
  closeOnSelect?: boolean
}

PhoneInput.CountrySelect = function PhoneInputCountrySelect({
  children,
  className,
  closeOnSelect = true,
}: PhoneInputCountrySelectProps) {
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
        const nextCountry = selectDetails.value[0]
        if (nextCountry && isSupportedCountry(nextCountry)) {
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

type PhoneInputCountryPickerProps = {
  className?: string
  selectProps?: Omit<PhoneInputCountrySelectProps, "children">
  controlProps?: PhoneInputCountryControlProps
  triggerProps?: PhoneInputCountryTriggerProps
  positionerProps?: PhoneInputCountryPositionerProps
  contentProps?: PhoneInputCountryContentProps
}

PhoneInput.CountryPicker = function PhoneInputCountryPicker({
  className,
  selectProps,
  controlProps,
  triggerProps,
  positionerProps,
  contentProps,
}: PhoneInputCountryPickerProps) {
  const { countries } = usePhoneInputContext()

  return (
    <PhoneInput.CountrySelect
      {...selectProps}
      className={selectProps?.className ?? className}
    >
      <PhoneInput.CountryControl {...controlProps}>
        <PhoneInput.CountryTrigger {...triggerProps} />
      </PhoneInput.CountryControl>
      <PhoneInput.CountryPositioner {...positionerProps}>
        <PhoneInput.CountryContent {...contentProps}>
          {countries.map((item) => (
            <PhoneInput.CountryItem item={item} key={item.value}>
              <PhoneInput.CountryItemText />
              <PhoneInput.CountryItemMeta />
            </PhoneInput.CountryItem>
          ))}
        </PhoneInput.CountryContent>
      </PhoneInput.CountryPositioner>
    </PhoneInput.CountrySelect>
  )
}

interface PhoneInputCountryControlProps
  extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>
}

PhoneInput.CountryControl = function PhoneInputCountryControl({
  children,
  className,
  ref,
  ...props
}: PhoneInputCountryControlProps) {
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

type PhoneInputCountryTriggerProps = ComponentPropsWithoutRef<"button"> & {
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLButtonElement>
}

PhoneInput.CountryTrigger = function PhoneInputCountryTrigger({
  children,
  className,
  ref,
  ...props
}: PhoneInputCountryTriggerProps) {
  const { selectedCountryItem, size } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <Select.Trigger
      className={styles.countryTrigger({ className })}
      ref={ref}
      {...props}
    >
      {children ?? (
        <PhoneInput.CountryValue>
          <PhoneInput.CountryFlag item={selectedCountryItem} />
          <PhoneInput.CountryCallingCode item={selectedCountryItem} />
        </PhoneInput.CountryValue>
      )}
    </Select.Trigger>
  )
}

interface PhoneInputCountryValueProps extends ComponentPropsWithoutRef<"span"> {
  ref?: Ref<HTMLSpanElement>
}

PhoneInput.CountryValue = function PhoneInputCountryValue({
  children,
  className,
  ref,
  ...props
}: PhoneInputCountryValueProps) {
  const { size } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <span className={styles.countryValue({ className })} ref={ref} {...props}>
      {children}
    </span>
  )
}

interface PhoneInputCountryFlagProps extends ComponentPropsWithoutRef<"span"> {
  item?: PhoneInputCountry
  ref?: Ref<HTMLSpanElement>
}

PhoneInput.CountryFlag = function PhoneInputCountryFlag({
  item,
  className,
  ref,
  ...props
}: PhoneInputCountryFlagProps) {
  const { selectedCountryItem, size } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <span className={styles.countryFlag({ className })} ref={ref} {...props}>
      {renderCountryFlag(item ?? selectedCountryItem)}
    </span>
  )
}

interface PhoneInputCountryCallingCodeProps
  extends ComponentPropsWithoutRef<"span"> {
  item?: PhoneInputCountry
  ref?: Ref<HTMLSpanElement>
}

PhoneInput.CountryCallingCode = function PhoneInputCountryCallingCode({
  item,
  className,
  ref,
  ...props
}: PhoneInputCountryCallingCodeProps) {
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

interface PhoneInputInputProps
  extends Omit<
    InputProps,
    "disabled" | "readOnly" | "required" | "size" | "value" | "variant"
  > {
  onChange?: ChangeEventHandler<HTMLInputElement>
}

PhoneInput.Input = function PhoneInputInput({
  className,
  onChange,
  placeholder = "Phone number",
  ref,
  ...props
}: PhoneInputInputProps) {
  const {
    disabled,
    inputId,
    inputValue,
    readOnly,
    required,
    setInputValue,
    size,
    validateStatus,
  } = usePhoneInputContext()
  const styles = phoneInputVariants({ size })

  return (
    <Input
      aria-invalid={validateStatus === "error" || undefined}
      className={styles.input({ className })}
      disabled={disabled}
      id={inputId}
      inputMode="tel"
      onChange={(event) => {
        setInputValue(event.target.value)
        onChange?.(event)
      }}
      placeholder={placeholder}
      readOnly={readOnly}
      ref={ref}
      required={required}
      size={size}
      type="tel"
      value={inputValue}
      {...props}
    />
  )
}

interface PhoneInputCountryPositionerProps
  extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement>
}

PhoneInput.CountryPositioner = function PhoneInputCountryPositioner({
  children,
  ...props
}: PhoneInputCountryPositionerProps) {
  return <Select.Positioner {...props}>{children}</Select.Positioner>
}

interface PhoneInputCountryContentProps extends ComponentPropsWithoutRef<"ul"> {
  ref?: Ref<HTMLUListElement>
}

PhoneInput.CountryContent = function PhoneInputCountryContent({
  children,
  ...props
}: PhoneInputCountryContentProps) {
  return <Select.Content {...props}>{children}</Select.Content>
}

interface PhoneInputCountryItemProps extends ComponentPropsWithoutRef<"li"> {
  item: PhoneInputCountry
  ref?: Ref<HTMLLIElement>
}

PhoneInput.CountryItem = function PhoneInputCountryItem({
  item,
  children,
  ...props
}: PhoneInputCountryItemProps) {
  return (
    <PhoneInputItemContext.Provider value={{ item }}>
      <Select.Item item={item} {...props}>
        {children}
      </Select.Item>
    </PhoneInputItemContext.Provider>
  )
}

interface PhoneInputCountryItemTextProps
  extends ComponentPropsWithoutRef<"span"> {
  ref?: Ref<HTMLSpanElement>
}

PhoneInput.CountryItemText = function PhoneInputCountryItemText({
  children,
  ...props
}: PhoneInputCountryItemTextProps) {
  const { size } = usePhoneInputContext()
  const { item } = usePhoneInputItemContext()
  const styles = phoneInputVariants({ size })

  return (
    <Select.ItemText {...props}>
      {children ?? (
        <span className={styles.itemContent()}>
          <PhoneInput.CountryFlag item={item} />
          <span className="truncate">{item.label}</span>
        </span>
      )}
    </Select.ItemText>
  )
}

interface PhoneInputCountryItemMetaProps
  extends ComponentPropsWithoutRef<"span"> {
  ref?: Ref<HTMLSpanElement>
}

PhoneInput.CountryItemMeta = function PhoneInputCountryItemMeta({
  children,
  className,
  ref,
  ...props
}: PhoneInputCountryItemMetaProps) {
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
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLSpanElement>
}

PhoneInput.CountryItemIndicator = function PhoneInputCountryItemIndicator({
  ...props
}: PhoneInputCountryItemIndicatorProps) {
  return <Select.ItemIndicator {...props} />
}

PhoneInput.Positioner = PhoneInput.CountryPositioner
PhoneInput.Content = PhoneInput.CountryContent
PhoneInput.Item = PhoneInput.CountryItem
PhoneInput.ItemText = PhoneInput.CountryItemText
PhoneInput.ItemMeta = PhoneInput.CountryItemMeta
PhoneInput.ItemIndicator = PhoneInput.CountryItemIndicator

interface PhoneInputStatusTextProps extends ComponentPropsWithoutRef<"div"> {
  status?: PhoneInputValidateStatus
  showIcon?: boolean
  ref?: Ref<HTMLDivElement>
}

PhoneInput.StatusText = function PhoneInputStatusText({
  status,
  showIcon,
  children,
  ...props
}: PhoneInputStatusTextProps) {
  const { size, validateStatus } = usePhoneInputContext()

  return (
    <StatusText
      showIcon={showIcon}
      size={size}
      status={status ?? validateStatus}
      {...props}
    >
      {children}
    </StatusText>
  )
}

export function formatPhoneInputValue(
  value: string,
  country: CountryCode
): string {
  if (!value.trim()) {
    return ""
  }

  const parsedNumber = parsePhoneNumberFromString(value, country)
  if (parsedNumber?.country === country) {
    return parsedNumber.formatNational()
  }

  return formatIncompletePhoneNumber(value, country)
}

export function getPhoneInputValueDetails(
  value: string,
  country: CountryCode
): PhoneInputValueChangeDetails {
  const formattedValue = formatPhoneInputValue(value, country)
  const formatter = new AsYouType(country)

  formatter.input(value)

  const parsedNumber =
    parsePhoneNumberFromString(value, country) ??
    parsePhoneNumberFromString(formattedValue, country)

  return {
    value: formattedValue,
    e164: parsedNumber?.number ?? formatter.getNumberValue() ?? "",
    country,
    callingCode: getPhoneCountryCallingCode(country),
    nationalNumber:
      parsedNumber?.nationalNumber.toString() ?? formatter.getNationalNumber(),
    isPossible: parsedNumber?.isPossible() ?? formatter.isPossible(),
    isValid: parsedNumber?.isValid() ?? formatter.isValid(),
  }
}

function resolveCountry(
  countries: PhoneInputCountry[],
  country: CountryCode
): CountryCode {
  const supportedCountry = isSupportedCountry(country) ? country : "SK"

  if (countries.some((item) => item.value === supportedCountry)) {
    return supportedCountry
  }

  return countries[0]?.value ?? "SK"
}

function getCountryItem(
  countries: PhoneInputCountry[],
  country: CountryCode
): PhoneInputCountry {
  return (
    countries.find((item) => item.value === country) ?? {
      value: country,
      label: country,
      name: country,
    }
  )
}

function getPhoneCountryCallingCode(
  country: CountryCode | PhoneInputCountry
): string {
  if (typeof country !== "string" && country.callingCode) {
    return country.callingCode
  }

  const countryCode = typeof country === "string" ? country : country.value

  return getCountryCallingCode(countryCode)
}

function renderCountryFlag(item: PhoneInputCountry) {
  return item.flag ?? item.value
}

export { phoneInputVariants, usePhoneInputContext }

PhoneInput.displayName = "PhoneInput"
