import {
  AsYouType,
  type CountryCode,
  type E164Number,
  formatIncompletePhoneNumber,
  getCountryCallingCode,
  isSupportedCountry,
  parseIncompletePhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max"
import {
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
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

type PhoneInputValueDetailsOptions = {
  countries?: PhoneInputCountry[]
  syncCountryFromValue?: boolean
}

const defaultNativeValidationMessage = "Enter a valid phone number."

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
      "phone-input-focus",
      "data-[disabled]:cursor-not-allowed",
      "data-[disabled]:border-phone-input-border-disabled",
      "data-[disabled]:bg-phone-input-bg-disabled",
      "data-[disabled]:text-phone-input-fg-disabled",
      "data-[validation=error]:border-(length:--border-width-validation)",
      "data-[validation=error]:border-phone-input-border-danger data-[validation=error]:outline-phone-input-border-danger",
      "data-[validation=error]:outline-(style:--default-ring-style) data-[validation=error]:outline-(length:--default-ring-width)",
      "data-[validation=error]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=success]:border-(length:--border-width-validation)",
      "data-[validation=success]:border-phone-input-border-success data-[validation=success]:outline-phone-input-border-success",
      "data-[validation=success]:outline-(style:--default-ring-style) data-[validation=success]:outline-(length:--default-ring-width)",
      "data-[validation=success]:outline-offset-(length:--default-ring-offset)",
      "data-[validation=warning]:border-(length:--border-width-validation)",
      "data-[validation=warning]:border-phone-input-border-warning data-[validation=warning]:outline-phone-input-border-warning",
      "data-[validation=warning]:outline-(style:--default-ring-style) data-[validation=warning]:outline-(length:--default-ring-width)",
      "data-[validation=warning]:outline-offset-(length:--default-ring-offset)",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    countrySelectRoot: ["contents"],
    countrySelectControl: ["h-full w-auto shrink-0"],
    countryTrigger: [
      "shrink-0",
      "bg-phone-input-trigger-bg-base",
      "hover:bg-phone-input-trigger-bg-hover",
      "border-(length:--border-phone-input-trigger)",
      "focus-visible:outline-none",
      "w-phone-input-trigger",
      "focus-visible:bg-phone-input-trigger-bg-hover",
    ],
    countryValue: ["flex items-center gap-phone-input-country-value"],
    countryFlag: [
      "inline-flex min-w-phone-input-country-flag items-center justify-center",
      "rounded-phone-input-country-flag",
      "font-medium text-phone-input-country-flag uppercase",
    ],
    countryCallingCode: ["font-medium text-phone-input-country-calling-code-fg"],
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
  },
  variants: {
    size: {
      sm: {
        control: "h-form-control-sm rounded-phone-input-sm text-phone-input-sm",
        input: "text-phone-input-sm",
      },
      md: {
        control: "h-form-control-md rounded-phone-input-md text-phone-input-md",
        input: "text-phone-input-md",
      },
      lg: {
        control: "h-form-control-lg rounded-phone-input-lg text-phone-input-lg",
        input: "text-phone-input-lg",
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
  nativeValidation: boolean
  nativeValidationMessage: string
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

export type PhoneInputProps = VariantProps<typeof phoneInputVariants> &
  Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> & {
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
    nativeValidation?: boolean
    nativeValidationMessage?: string
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
}: PhoneInputProps) {
  const generatedId = useId()
  const id = providedId || generatedId
  const countries = useMemo(
    () =>
      normalizePhoneInputCountries(
        countriesProp.length > 0 ? countriesProp : defaultPhoneInputCountries
      ),
    [countriesProp]
  )
  const fallbackCountry = resolveCountry(
    countries,
    getInitialCountry(value ?? defaultValue, defaultCountry, countries)
  )

  const [internalCountry, setInternalCountry] =
    useState<CountryCode>(fallbackCountry)
  const selectedCountry = resolveCountry(countries, country ?? internalCountry)
  const selectedCountryItem = getCountryItem(countries, selectedCountry)
  const previousControlledValueRef = useRef(value)

  const [internalValue, setInternalValue] = useState(() =>
    formatPhoneInputValue(defaultValue, selectedCountry)
  )
  const isValueControlled = value !== undefined
  const inputValue = isValueControlled
    ? formatPhoneInputValue(value, selectedCountry)
    : internalValue

  const details = useMemo(
    () =>
      getPhoneInputValueDetailsInternal(inputValue, selectedCountry, {
        countries,
      }),
    [countries, inputValue, selectedCountry]
  )
  const nativeFormValue = details.isValid ? details.e164 : inputValue

  useEffect(() => {
    if (
      !isValueControlled ||
      country ||
      value === previousControlledValueRef.current
    ) {
      return
    }

    previousControlledValueRef.current = value

    const nextCountry = getCountryFromValue(value ?? "", countries)

    if (nextCountry && nextCountry !== internalCountry) {
      setInternalCountry(nextCountry)
    }
  }, [countries, country, internalCountry, isValueControlled, value])

  const setInputValue = (nextValue: string) => {
    const nextDetails = getPhoneInputValueDetailsInternal(
      nextValue,
      selectedCountry,
      {
        countries,
        syncCountryFromValue: true,
      }
    )
    const didChangeCountry = nextDetails.country !== selectedCountry

    if (!isValueControlled) {
      setInternalValue(nextDetails.value)
    }

    if (didChangeCountry && !country) {
      setInternalCountry(nextDetails.country)
    }

    if (didChangeCountry) {
      onCountryChange?.({
        ...nextDetails,
        countryItem: getCountryItem(countries, nextDetails.country),
      })
    }

    onValueChange?.(nextDetails)
  }

  const setCountryValue = (nextCountry: CountryCode) => {
    const nextCountryItem = getCountryItem(countries, nextCountry)
    const nextDetails = getPhoneInputValueDetailsInternal(
      inputValue,
      nextCountry,
      {
        countries,
      }
    )

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
        nativeValidation,
        nativeValidationMessage,
        readOnly,
        required,
        validateStatus,
      }}
    >
      {name && (
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

type PhoneInputControlProps = ComponentPropsWithoutRef<"div"> & {
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

type PhoneInputCountryControlProps = ComponentPropsWithoutRef<"div"> & {
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

type PhoneInputCountryValueProps = ComponentPropsWithoutRef<"span"> & {
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

type PhoneInputCountryFlagProps = ComponentPropsWithoutRef<"span"> & {
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

type PhoneInputCountryCallingCodeProps = ComponentPropsWithoutRef<"span"> & {
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
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      assignRef(ref, node)
    },
    [ref]
  )

  useEffect(() => {
    const input = inputRef.current

    if (!input) {
      return
    }

    const hasInvalidValue =
      nativeValidation &&
      inputValue.trim() !== "" &&
      !details.isValid &&
      !disabled &&
      !readOnly

    input.setCustomValidity(hasInvalidValue ? nativeValidationMessage : "")
  }, [
    details.isValid,
    disabled,
    inputValue,
    nativeValidation,
    nativeValidationMessage,
    readOnly,
  ])

  return (
    <Input
      {...props}
      aria-invalid={
        validateStatus === "error" ||
        (nativeValidation && inputValue.trim() !== "" && !details.isValid) ||
        undefined
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
  ref?: Ref<HTMLDivElement>
}

PhoneInput.CountryPositioner = function PhoneInputCountryPositioner({
  children,
  ...props
}: PhoneInputCountryPositionerProps) {
  return <Select.Positioner {...props}>{children}</Select.Positioner>
}

type PhoneInputCountryContentProps = ComponentPropsWithoutRef<"ul"> & {
  ref?: Ref<HTMLUListElement>
}

PhoneInput.CountryContent = function PhoneInputCountryContent({
  children,
  ...props
}: PhoneInputCountryContentProps) {
  return <Select.Content {...props}>{children}</Select.Content>
}

type PhoneInputCountryItemProps = ComponentPropsWithoutRef<"li"> & {
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

type PhoneInputCountryItemTextProps = ComponentPropsWithoutRef<"span"> & {
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

type PhoneInputCountryItemMetaProps = ComponentPropsWithoutRef<"span"> & {
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

type PhoneInputStatusTextProps = ComponentPropsWithoutRef<"div"> & {
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
    return formatNationalSignificantPhoneValue(
      parsedNumber.nationalNumber,
      country
    )
  }

  if (parsedNumber?.country) {
    return formatIncompletePhoneNumber(value, country)
  }

  return formatNationalSignificantPhoneValue(value, country)
}

export function getPhoneInputValueDetails(
  value: string,
  country: CountryCode
): PhoneInputValueChangeDetails {
  return getPhoneInputValueDetailsInternal(value, country)
}

function getPhoneInputValueDetailsInternal(
  value: string,
  country: CountryCode,
  options: PhoneInputValueDetailsOptions = {}
): PhoneInputValueChangeDetails {
  const parsedValue = parsePhoneNumberFromString(value, country)
  const valueCountry = parsedValue?.country
  const detailsCountry =
    options.syncCountryFromValue &&
    valueCountry &&
    isCountryAvailable(options.countries, valueCountry)
      ? valueCountry
      : country
  const formattedValue = formatPhoneInputValue(value, detailsCountry)
  const formatter = new AsYouType(detailsCountry)

  formatter.input(value)

  const parsedNumber =
    parsePhoneNumberFromString(value, detailsCountry) ??
    parsePhoneNumberFromString(formattedValue, detailsCountry)
  const hasCountryMismatch =
    !!parsedNumber?.country && parsedNumber.country !== detailsCountry
  const detailsNumber = hasCountryMismatch ? undefined : parsedNumber
  const formatterNumber = formatter.getNumber()
  const isPossible = hasCountryMismatch
    ? false
    : (detailsNumber?.isPossible() ?? formatter.isPossible())
  const isValid = hasCountryMismatch
    ? false
    : (detailsNumber?.isValid() ?? formatter.isValid())

  return {
    value: formattedValue,
    e164: isValid
      ? (detailsNumber?.number ?? formatter.getNumberValue() ?? "")
      : "",
    country: detailsCountry,
    callingCode: getPhoneCountryCallingCode(detailsCountry),
    nationalNumber: hasCountryMismatch
      ? ""
      : (detailsNumber?.nationalNumber.toString() ??
        formatterNumber?.nationalNumber ??
        ""),
    isPossible,
    isValid,
  }
}

function normalizePhoneInputCountries(
  countries: PhoneInputCountry[]
): PhoneInputCountry[] {
  return countries.map((item) => {
    const displayValue = getCountryDisplayValue(item)

    if (item.displayValue === displayValue) {
      return item
    }

    return {
      ...item,
      displayValue,
    }
  })
}

function getCountryDisplayValue(item: PhoneInputCountry): string {
  if (item.displayValue) {
    return item.displayValue
  }

  if (item.name) {
    return item.name
  }

  return typeof item.label === "string" ? item.label : item.value
}

function isCountryAvailable(
  countries: PhoneInputCountry[] | undefined,
  country: CountryCode
): boolean {
  if (!isSupportedCountry(country)) {
    return false
  }

  return (
    !countries ||
    countries.some((item) => item.value === country && !item.disabled)
  )
}

function getInitialCountry(
  value: string,
  defaultCountry: CountryCode,
  countries: PhoneInputCountry[]
): CountryCode {
  const parsedCountry = getCountryFromValue(value, countries)

  if (parsedCountry) {
    return parsedCountry
  }

  return defaultCountry
}

function getCountryFromValue(
  value: string,
  countries: PhoneInputCountry[]
): CountryCode | undefined {
  const parsedCountry = parsePhoneNumberFromString(value)?.country

  return parsedCountry && isCountryAvailable(countries, parsedCountry)
    ? parsedCountry
    : undefined
}

function formatNationalSignificantPhoneValue(
  value: string,
  country: CountryCode
) {
  const callingCode = getPhoneCountryCallingCode(country)
  const incompleteValue = parseIncompletePhoneNumber(value)

  if (incompleteValue.startsWith("+")) {
    if (incompleteValue.startsWith(`+${callingCode}`)) {
      return stripCountryCallingCode(
        formatIncompletePhoneNumber(incompleteValue, country),
        callingCode
      )
    }

    return formatIncompletePhoneNumber(value, country)
  }

  return stripCountryCallingCode(
    formatIncompletePhoneNumber(`+${callingCode}${incompleteValue}`, country),
    callingCode
  )
}

function stripCountryCallingCode(value: string, callingCode: string) {
  const prefix = `+${callingCode}`

  return value.startsWith(prefix)
    ? value.slice(prefix.length).trimStart()
    : value
}

function resolveCountry(
  countries: PhoneInputCountry[],
  country: CountryCode
): CountryCode {
  const supportedCountry = isSupportedCountry(country) ? country : "SK"

  if (isCountryAvailable(countries, supportedCountry)) {
    return supportedCountry
  }

  return countries.find((item) => !item.disabled)?.value ?? "SK"
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

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) {
    return
  }

  if (typeof ref === "function") {
    ref(value)
    return
  }

  ;(ref as { current: T | null }).current = value
}

function getPhoneCountryCallingCode(
  country: CountryCode | PhoneInputCountry
): string {
  const countryCode = typeof country === "string" ? country : country.value
  const callingCode = getCountryCallingCode(countryCode)

  if (typeof country !== "string" && country.callingCode === callingCode) {
    return country.callingCode
  }

  return callingCode
}

function renderCountryFlag(item: PhoneInputCountry) {
  return item.flag ?? item.value
}

export { phoneInputVariants, usePhoneInputContext }

PhoneInput.displayName = "PhoneInput"
