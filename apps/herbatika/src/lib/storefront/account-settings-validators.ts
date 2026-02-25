import type { HttpTypes } from "@medusajs/types";

const PHONE_ALLOWED_REGEX = /^[0-9+\s()-]+$/;

export type AccountSettingsValues = {
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
};

const validateName = (value: string, label: "Meno" | "Priezvisko") => {
  if (value.trim().length < 2) {
    return `${label} musí mať aspoň 2 znaky.`;
  }

  return undefined;
};

const validatePhone = (value: string) => {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  if (!PHONE_ALLOWED_REGEX.test(normalized)) {
    return "Zadajte platné telefónne číslo.";
  }

  const digitCount = normalized.replace(/\D/g, "").length;
  if (digitCount < 7) {
    return "Telefónne číslo musí obsahovať aspoň 7 číslic.";
  }

  return undefined;
};

export const accountSettingsValidators = {
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
  phone: {
    onChange: ({ value }: { value: string }) => validatePhone(value),
    onBlur: ({ value }: { value: string }) => validatePhone(value),
  },
};

export const isAccountSettingsFormValid = (values: AccountSettingsValues) => {
  return (
    !validateName(values.first_name, "Meno") &&
    !validateName(values.last_name, "Priezvisko") &&
    !validatePhone(values.phone)
  );
};

export const toAccountSettingsValues = (
  customer: HttpTypes.StoreCustomer | null | undefined,
): AccountSettingsValues => {
  return {
    first_name: customer?.first_name ?? "",
    last_name: customer?.last_name ?? "",
    phone: customer?.phone ?? "",
    company_name:
      (customer as unknown as { company_name?: string | null })?.company_name ?? "",
  };
};
