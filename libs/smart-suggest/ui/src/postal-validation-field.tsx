import type {
  PostalInputHints,
  PostalValidationRequest,
  PostalValidationResult,
  PostalValidationStatus,
} from '@techsio/smart-suggest-react';
import type { ValidationIssue } from '@techsio/smart-suggest-validation/phone-lite';
import { FormInput } from '@techsio/ui-kit/molecules/form-input';
import {
  type FocusEvent,
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

type FormInputProps = ComponentPropsWithoutRef<typeof FormInput>;

export type PostalValidationFieldValidator = (
  request: PostalValidationRequest,
) => PostalValidationResult | Promise<PostalValidationResult | undefined> | undefined;

export type PostalValidationFieldProps = Omit<
  FormInputProps,
  'autoComplete' | 'helpText' | 'inputMode' | 'onChange' | 'validateStatus'
> & {
  countryCode: Uppercase<string>;
  helpText?: ReactNode;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  onValidationChange?: (result: PostalValidationResult) => void;
  statusText?: ReactNode;
  validatePostalCode?: PostalValidationFieldValidator;
  validateEmpty?: boolean;
};

const TEXT_POSTAL_INPUT_COUNTRIES = new Set<Uppercase<string>>([
  'CA',
  'GB',
  'IE',
  'MT',
  'NL',
  'US',
]);

const POSTAL_CODE_PATTERNS: Partial<Record<Uppercase<string>, RegExp>> = {
  AT: /^\d{4}$/,
  CA: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][\s-]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
  CZ: /^\d{3}\s?\d{2}$/,
  DE: /^\d{5}$/,
  GB: /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i,
  HU: /^\d{4}$/,
  PL: /^\d{2}-?\d{3}$/,
  RO: /^\d{6}$/,
  SK: /^\d{3}\s?\d{2}$/,
  US: /^\d{5}(?:-\d{4})?$/,
};

const createIssue = (code: string, field: string, message: string): ValidationIssue => ({
  code,
  field,
  message,
});

const digitsOnly = (value: string) => value.replaceAll(/\D/g, '');

const normalizePostalText = (value: string) => value.trim().toUpperCase().replaceAll(/\s+/g, ' ');

const isPostalCodeValidForCountry = (
  countryCode: Uppercase<string>,
  displayValue: string,
): PostalValidationStatus => {
  const pattern = POSTAL_CODE_PATTERNS[countryCode];

  if (pattern === undefined) {
    return 'unknown';
  }

  return pattern.test(displayValue);
};

const formatPostalDisplayValue = (countryCode: Uppercase<string>, value: string) => {
  const normalizedText = normalizePostalText(value);
  const digits = digitsOnly(normalizedText);

  if ((countryCode === 'CZ' || countryCode === 'SK') && digits.length === 5) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }

  if (countryCode === 'PL' && digits.length === 5) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  if (countryCode === 'US' && digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  if (countryCode === 'CA') {
    const compact = normalizedText.replaceAll(/[\s-]/g, '');

    if (compact.length === 6) {
      return `${compact.slice(0, 3)} ${compact.slice(3)}`;
    }
  }

  if (countryCode === 'GB') {
    const compact = normalizedText.replaceAll(/\s/g, '');

    if (compact.length > 3) {
      return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
    }
  }

  return normalizedText;
};

const getPostalInputHints = (countryCode: Uppercase<string>): PostalInputHints => ({
  autoComplete: 'postal-code',
  inputMode: TEXT_POSTAL_INPUT_COUNTRIES.has(countryCode) ? 'text' : 'numeric',
});

const validatePostalCode = (request: PostalValidationRequest): PostalValidationResult => {
  const rawInput = request.rawInput;
  const countryCode = request.countryCode.trim().toUpperCase() as Uppercase<string>;
  const normalizedValue = normalizePostalText(rawInput);
  const displayValue = formatPostalDisplayValue(countryCode, rawInput);
  const errors: ValidationIssue[] = [];

  if (normalizedValue.length === 0) {
    return {
      rawInput,
      countryCode,
      normalizedValue,
      displayValue,
      isValid: false,
      inputHints: getPostalInputHints(countryCode),
      errors: [createIssue('postal.required', 'postalCode', 'Enter a postal code.')],
    };
  }

  const metadataResult = isPostalCodeValidForCountry(countryCode, displayValue);

  if (metadataResult === true) {
    return {
      rawInput,
      countryCode,
      normalizedValue,
      displayValue,
      isValid: true,
      inputHints: getPostalInputHints(countryCode),
      errors,
    };
  }

  if (metadataResult === 'unknown') {
    return {
      rawInput,
      countryCode,
      normalizedValue,
      displayValue,
      isValid: 'unknown',
      inputHints: getPostalInputHints(countryCode),
      errors: [
        createIssue(
          'postal.country_unsupported',
          'postalCode',
          'Postal-code metadata is not available for this country.',
        ),
      ],
    };
  }

  return {
    rawInput,
    countryCode,
    normalizedValue,
    displayValue,
    isValid: false,
    inputHints: getPostalInputHints(countryCode),
    errors: [
      createIssue(
        'postal.invalid',
        'postalCode',
        'Enter a valid postal code for the selected country.',
      ),
    ],
  };
};

const getValidationStatus = (
  status: PostalValidationStatus | undefined,
): 'default' | 'error' | 'success' | 'warning' => {
  if (status === undefined) {
    return 'default';
  }

  if (status === 'unknown') {
    return 'warning';
  }

  return status ? 'success' : 'error';
};

const getStatusText = (
  helpText: ReactNode,
  result: PostalValidationResult | undefined,
  statusText: ReactNode,
) => {
  if (helpText !== undefined) {
    return helpText;
  }

  if (statusText !== undefined) {
    return statusText;
  }

  return result?.errors[0]?.message;
};

const ignorePostalValidationError = () => null;

export function PostalValidationField({
  countryCode,
  defaultValue,
  helpText,
  onBlur,
  onChange,
  onValidationChange,
  statusText,
  validatePostalCode: providedValidatePostalCode,
  validateEmpty = false,
  value,
  ...props
}: PostalValidationFieldProps) {
  const [internalRawInput, setInternalRawInput] = useState(() =>
    String(value ?? defaultValue ?? ''),
  );
  const rawInput = typeof value === 'string' ? value : String(value ?? internalRawInput);
  const shouldValidate = validateEmpty || rawInput.trim().length > 0;
  const normalizedCountryCode = countryCode.trim().toUpperCase() as Uppercase<string>;
  const validationResult = useMemo(
    () =>
      shouldValidate && providedValidatePostalCode === undefined
        ? validatePostalCode({
            countryCode: normalizedCountryCode,
            rawInput,
          })
        : undefined,
    [normalizedCountryCode, providedValidatePostalCode, rawInput, shouldValidate],
  );
  const [serverValidationResult, setServerValidationResult] = useState<
    PostalValidationResult | undefined
  >(undefined);
  const validationRequestIdRef = useRef(0);
  const resolvedValidationResult = serverValidationResult ?? validationResult;
  const inputHints = getPostalInputHints(normalizedCountryCode);
  const validateStatus = getValidationStatus(resolvedValidationResult?.isValid);
  const resolvedStatusText = getStatusText(helpText, resolvedValidationResult, statusText);
  const formInputDefaultValueProps = defaultValue === undefined ? {} : { defaultValue };
  const formInputHelpTextProps =
    resolvedStatusText === undefined ? {} : { helpText: resolvedStatusText };
  const formInputValueProps = value === undefined ? {} : { value };
  const clearServerValidationResult = useCallback(() => {
    validationRequestIdRef.current += 1;
    setServerValidationResult(undefined);
  }, []);
  const validateCurrentValue = useCallback(
    async (nextRawInput = rawInput) => {
      const shouldValidateCurrent = validateEmpty || nextRawInput.trim().length > 0;
      const validationRequestId = validationRequestIdRef.current + 1;
      validationRequestIdRef.current = validationRequestId;

      if (!shouldValidateCurrent) {
        setServerValidationResult(undefined);
        return;
      }

      const request: PostalValidationRequest = {
        countryCode: normalizedCountryCode,
        rawInput: nextRawInput,
      };
      const fallbackResult = validatePostalCode(request);
      let nextResult = fallbackResult;

      try {
        nextResult = (await providedValidatePostalCode?.(request)) ?? fallbackResult;
      } catch {
        nextResult = fallbackResult;
      }

      if (validationRequestId !== validationRequestIdRef.current) {
        return;
      }

      setServerValidationResult(nextResult);
      onValidationChange?.(nextResult);
    },
    [normalizedCountryCode, onValidationChange, providedValidatePostalCode, rawInput, validateEmpty],
  );

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);

    if (providedValidatePostalCode !== undefined) {
      validateCurrentValue().catch(ignorePostalValidationError);
    }
  };

  return (
    <FormInput
      autoComplete={inputHints.autoComplete}
      inputMode={inputHints.inputMode}
      onBlur={handleBlur}
      onChange={(event) => {
        const nextValue = event.target.value;

        if (value === undefined) {
          setInternalRawInput(nextValue);
        }

        clearServerValidationResult();

        if (providedValidatePostalCode === undefined) {
          onValidationChange?.(
            validatePostalCode({
              countryCode: normalizedCountryCode,
              rawInput: nextValue,
            }),
          );
        }

        onChange?.(event);

        if (providedValidatePostalCode !== undefined) {
          validateCurrentValue(nextValue).catch(ignorePostalValidationError);
        }
      }}
      validateStatus={validateStatus}
      {...props}
      {...formInputDefaultValueProps}
      {...formInputHelpTextProps}
      {...formInputValueProps}
    />
  );
}
