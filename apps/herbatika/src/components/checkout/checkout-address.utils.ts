import type { HttpTypes } from "@medusajs/types";
import type { AddressFormState } from "./checkout.constants";

export const buildMissingFieldMessage = (
  form: AddressFormState,
  isCompanyPurchase: boolean,
) => {
  const missing: string[] = [];

  if (!form.email.trim()) {
    missing.push("email");
  }
  if (!form.firstName.trim()) {
    missing.push("meno");
  }
  if (!form.lastName.trim()) {
    missing.push("priezvisko");
  }
  if (!form.phone.trim()) {
    missing.push("telefón");
  }
  if (!form.address1.trim()) {
    missing.push("ulica");
  }
  if (!form.city.trim()) {
    missing.push("mesto");
  }
  if (!form.postalCode.trim()) {
    missing.push("PSČ");
  }
  if (!form.countryCode.trim()) {
    missing.push("krajina");
  }
  if (isCompanyPurchase) {
    if (!form.company.trim()) {
      missing.push("názov firmy");
    }
    if (!form.companyId.trim()) {
      missing.push("IČO");
    }
    if (!form.taxId.trim()) {
      missing.push("DIČ");
    }
  }

  if (missing.length === 0) {
    return null;
  }

  return `Vyplňte povinné polia: ${missing.join(", ")}`;
};

export const resolveHasStoredAddress = (
  cart: HttpTypes.StoreCart | null | undefined,
) => {
  if (!cart?.email) {
    return false;
  }

  const address = cart.billing_address ?? cart.shipping_address;
  if (!address) {
    return false;
  }

  return Boolean(
    address.first_name &&
      address.last_name &&
      address.address_1 &&
      address.city &&
      address.postal_code &&
      address.country_code,
  );
};
