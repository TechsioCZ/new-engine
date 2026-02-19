import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { resolveBlurAwareFieldError } from "@/components/auth/storefront-auth-helpers";

type AuthStringFieldApi = {
  name: string;
  state: {
    value: unknown;
    meta: {
      isBlurred: boolean;
      isDirty: boolean;
      errorMap: {
        onChange?: unknown;
        onBlur?: unknown;
      };
    };
  };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};

type AuthTextFieldProps = {
  field: AuthStringFieldApi;
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  required?: boolean;
  validationMode?: "none" | "blur";
  externalError?: string | null;
  onExternalErrorClear?: () => void;
};

export const AuthTextField = ({
  field,
  id,
  label,
  type = "text",
  autoComplete,
  required = false,
  validationMode = "none",
  externalError,
  onExternalErrorClear,
}: AuthTextFieldProps) => {
  const value = typeof field.state.value === "string" ? field.state.value : "";
  const fieldError =
    validationMode === "blur"
      ? resolveBlurAwareFieldError(field.state.meta)
      : undefined;
  const errorText = externalError ?? fieldError;
  const hasError = Boolean(errorText);

  return (
    <FormInput
      autoComplete={autoComplete}
      helpText={errorText}
      id={id}
      label={label}
      name={field.name}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value);

        if (externalError && onExternalErrorClear) {
          onExternalErrorClear();
        }
      }}
      required={required}
      type={type}
      validateStatus={hasError ? "error" : "default"}
      value={value}
    />
  );
};
