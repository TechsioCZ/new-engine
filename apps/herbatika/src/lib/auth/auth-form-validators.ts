const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_NUMBER_REGEX = /\d/;

export type RegisterFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  accept_terms: boolean;
};

type ConfirmPasswordFieldApi = {
  form: {
    getFieldValue: (name: "password") => unknown;
  };
};

const validateName = (value: string, label: "Meno" | "Priezvisko") => {
  if (value.trim().length < 2) {
    return `${label} musí mať aspoň 2 znaky.`;
  }

  return undefined;
};

const validateEmail = (value: string) => {
  if (!value.trim()) {
    return "Zadajte e-mail.";
  }

  if (!EMAIL_REGEX.test(value.trim())) {
    return "Zadajte platný e-mail.";
  }

  return undefined;
};

const validatePassword = (value: string) => {
  if (value.length < 8) {
    return "Heslo musí mať aspoň 8 znakov.";
  }

  if (!PASSWORD_NUMBER_REGEX.test(value)) {
    return "Heslo musí obsahovať aspoň jednu číslicu.";
  }

  return undefined;
};

const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string,
) => {
  if (!confirmPassword) {
    return "Potvrďte heslo.";
  }

  if (password !== confirmPassword) {
    return "Heslá sa nezhodujú.";
  }

  return undefined;
};

const validateTerms = (value: boolean) => {
  if (!value) {
    return "Potrebujeme súhlas s obchodnými podmienkami.";
  }

  return undefined;
};

export const PASSWORD_REQUIREMENTS = [
  {
    id: "min-length",
    label: "Alespoň 8 znaků",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "has-number",
    label: "Alespoň jedna číslice",
    test: (password: string) => PASSWORD_NUMBER_REGEX.test(password),
  },
] as const;

export const registerValidators = {
  first_name: {
    onChange: ({ value }: { value: string }) => validateName(value, "Meno"),
    onBlur: ({ value }: { value: string }) => validateName(value, "Meno"),
  },
  last_name: {
    onChange: ({ value }: { value: string }) =>
      validateName(value, "Priezvisko"),
    onBlur: ({ value }: { value: string }) =>
      validateName(value, "Priezvisko"),
  },
  email: {
    onChange: ({ value }: { value: string }) => validateEmail(value),
    onBlur: ({ value }: { value: string }) => validateEmail(value),
  },
  password: {
    onChange: ({ value }: { value: string }) => validatePassword(value),
    onBlur: ({ value }: { value: string }) => validatePassword(value),
  },
  confirm_password: {
    onChangeListenTo: ["password"] as Array<keyof RegisterFormValues>,
    onChange: ({
      value,
      fieldApi,
    }: {
      value: string;
      fieldApi: ConfirmPasswordFieldApi;
    }) => {
      const password =
        (fieldApi.form.getFieldValue("password") as string | undefined) ?? "";

      return validatePasswordConfirmation(password, value);
    },
    onBlur: ({
      value,
      fieldApi,
    }: {
      value: string;
      fieldApi: ConfirmPasswordFieldApi;
    }) => {
      const password =
        (fieldApi.form.getFieldValue("password") as string | undefined) ?? "";

      return validatePasswordConfirmation(password, value);
    },
  },
  accept_terms: {
    onChange: ({ value }: { value: boolean }) => validateTerms(value),
    onBlur: ({ value }: { value: boolean }) => validateTerms(value),
  },
};

export const isRegisterFormValid = (values: RegisterFormValues) => {
  return (
    !validateName(values.first_name, "Meno") &&
    !validateName(values.last_name, "Priezvisko") &&
    !validateEmail(values.email) &&
    !validatePassword(values.password) &&
    !validatePasswordConfirmation(values.password, values.confirm_password) &&
    !validateTerms(values.accept_terms)
  );
};

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
};

export const resolveLoginSubmitError = (error: unknown) => {
  const message = resolveErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("credential") ||
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("403")
  ) {
    return "Nesprávný email nebo heslo";
  }

  return message || "Prihlásenie sa nepodarilo. Skúste to prosím znovu.";
};
