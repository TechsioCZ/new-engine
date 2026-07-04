import type {
  PostalValidationRequest,
  PostalValidationResult,
  PostalValidationStatus,
} from '@techsio/smart-suggest-react';
import {
  getPostalInputHints,
  validatePostalCode as validatePostalCodeFallback,
} from '@techsio/smart-suggest-validation';
import { FormInput } from '@techsio/ui-kit/molecules/form-input';
import {
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getStatusText } from './validation-status-text';

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
  /** Called when validation changes; undefined means the result was cleared. */
  onValidationChange?: (result: PostalValidationResult | undefined) => void;
  statusText?: ReactNode;
  validatePostalCode?: PostalValidationFieldValidator;
  validateEmpty?: boolean;
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
        ? validatePostalCodeFallback({
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

  useEffect(() => {
    clearServerValidationResult();
  }, [clearServerValidationResult, normalizedCountryCode]);

  useEffect(() => {
    onValidationChange?.(resolvedValidationResult);
  }, [onValidationChange, resolvedValidationResult]);

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
      const fallbackResult = validatePostalCodeFallback(request);
      let nextResult: PostalValidationResult;

      try {
        nextResult = (await providedValidatePostalCode?.(request)) ?? fallbackResult;
      } catch {
        nextResult = fallbackResult;
      }

      if (validationRequestId !== validationRequestIdRef.current) {
        return;
      }

      setServerValidationResult(nextResult);
    },
    [normalizedCountryCode, providedValidatePostalCode, rawInput, validateEmpty],
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
