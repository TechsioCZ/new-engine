import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import { toFieldErrorText } from "@/components/auth/storefront-auth-helpers";

type RegisterTermsFieldApi = {
  state: {
    value: unknown;
    meta: {
      isTouched: boolean;
      errors: unknown[];
    };
  };
  handleChange: (value: boolean) => void;
  handleBlur: () => void;
};

type StorefrontRegisterTermsFieldProps = {
  field: RegisterTermsFieldApi;
  onChange: () => void;
};

export const StorefrontRegisterTermsField = ({
  field,
  onChange,
}: StorefrontRegisterTermsFieldProps) => {
  const errorText = field.state.meta.isTouched
    ? toFieldErrorText(field.state.meta.errors[0])
    : undefined;

  return (
    <FormCheckbox
      checked={Boolean(field.state.value)}
      helpText={errorText}
      id="auth-register-accept-terms"
      label="Súhlasím s obchodnými podmienkami"
      onCheckedChange={(checked) => {
        field.handleChange(checked);
        field.handleBlur();
        onChange();
      }}
      required
      showHelpTextIcon
      size="sm"
      validateStatus={errorText ? "error" : "default"}
    />
  );
};
