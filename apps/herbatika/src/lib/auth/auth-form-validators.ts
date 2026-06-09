import {
  passwordHasNumber,
  validateCustomerName,
  validateEmailAddress,
  validateLoginPassword,
  validatePasswordConfirmation,
  validateRegisterPassword,
  validateRequiredAgreement,
} from "@/lib/forms/validators/shared";
import {
  createChangeBlurContextualFieldValidators,
  createChangeBlurFieldValidators,
} from "@/lib/forms/validators/field-validator-factories";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";

export type LoginFormValues = {
  email: string;
  password: string;
};

export type RegisterFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  accept_terms: boolean;
};

export type ForgotPasswordFormValues = {
  email: string;
};

export type ResetPasswordFormValues = {
  password: string;
  confirm_password: string;
};

type ConfirmPasswordFieldApi = {
  form: {
    getFieldValue: (name: "password") => unknown;
  };
};

export const loginValidators = {
  email: createChangeBlurFieldValidators(validateEmailAddress),
  password: createChangeBlurFieldValidators(validateLoginPassword),
};

export const PASSWORD_REQUIREMENTS = [
  {
    id: "min-length",
    label: "Aspoň 8 znakov",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "has-number",
    label: "Aspoň jedna číslica",
    test: (password: string) => passwordHasNumber(password),
  },
] as const;

export const registerValidators = {
  first_name: createChangeBlurFieldValidators((value: string) =>
    validateCustomerName(value, "Meno"),
  ),
  last_name: createChangeBlurFieldValidators((value: string) =>
    validateCustomerName(value, "Priezvisko"),
  ),
  email: createChangeBlurFieldValidators(validateEmailAddress),
  password: createChangeBlurFieldValidators(validateRegisterPassword),
  confirm_password: {
    onChangeListenTo: ["password"] as Array<keyof RegisterFormValues>,
    ...createChangeBlurContextualFieldValidators(
      ({ value, fieldApi }: { value: string; fieldApi: ConfirmPasswordFieldApi }) => {
        const password =
          (fieldApi.form.getFieldValue("password") as string | undefined) ?? "";

        return validatePasswordConfirmation(password, value);
      },
    ),
  },
  accept_terms: createChangeBlurFieldValidators((value: boolean) =>
    validateRequiredAgreement(
      value,
      "Potrebujeme súhlas s obchodnými podmienkami.",
    ),
  ),
};

export const forgotPasswordValidators = {
  email: createChangeBlurFieldValidators(validateEmailAddress),
};

type ResetPasswordConfirmFieldApi = {
  form: {
    getFieldValue: (name: "password") => unknown;
  };
};

export const resetPasswordValidators = {
  password: createChangeBlurFieldValidators(validateRegisterPassword),
  confirm_password: {
    onChangeListenTo: ["password"] as Array<keyof ResetPasswordFormValues>,
    ...createChangeBlurContextualFieldValidators(
      ({
        value,
        fieldApi,
      }: {
        value: string;
        fieldApi: ResetPasswordConfirmFieldApi;
      }) => {
        const password =
          (fieldApi.form.getFieldValue("password") as string | undefined) ?? "";

        return validatePasswordConfirmation(password, value);
      },
    ),
  },
};

export const resolveLoginSubmitError = (error: unknown) => {
  const message = resolveErrorMessage(error, "");
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("credential") ||
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("403")
  ) {
    return "Nesprávny e-mail alebo heslo.";
  }

  return message || "Prihlásenie sa nepodarilo. Skúste to prosím znovu.";
};
