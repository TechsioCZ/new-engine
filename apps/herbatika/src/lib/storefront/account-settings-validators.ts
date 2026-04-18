import type { HttpTypes } from "@medusajs/types";
import { createChangeBlurFieldValidators } from "@/lib/forms/validators/field-validator-factories";
import {
  validateCustomerName,
  validateOptionalPhoneNumber,
} from "@/lib/forms/validators/shared";

export type AccountSettingsValues = {
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
};

export const accountSettingsValidators = {
  first_name: createChangeBlurFieldValidators((value: string) =>
    validateCustomerName(value, "Meno"),
  ),
  last_name: createChangeBlurFieldValidators((value: string) =>
    validateCustomerName(value, "Priezvisko"),
  ),
  phone: createChangeBlurFieldValidators(validateOptionalPhoneNumber),
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
