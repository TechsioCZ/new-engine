import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_FORM_TEXT_DEFINITIONS = [
  {
    description: "Popisek pole pro jméno.",
    key: "form.first_name",
    namespace: "form",
  },
  {
    description: "Popisek pole pro příjmení.",
    key: "form.last_name",
    namespace: "form",
  },
  {
    description: "Popisek pole pro název firmy.",
    key: "form.company_name",
    namespace: "form",
  },
  {
    description: "Popisek pole pro identifikační číslo firmy.",
    key: "form.company_id",
    namespace: "form",
  },
  {
    description: "Popisek pole pro daňové identifikační číslo.",
    key: "form.tax_id",
    namespace: "form",
  },
  {
    description: "Popisek pole pro identifikační číslo k DPH.",
    key: "form.vat_id",
    namespace: "form",
  },
  {
    description: "Popisek pole pro e-mailovou adresu.",
    key: "form.email",
    namespace: "form",
  },
  {
    description: "Popisek pole pro telefonní číslo.",
    key: "form.phone",
    namespace: "form",
  },
  {
    description: "Popisek pole pro výběr země.",
    key: "form.country",
    namespace: "form",
  },
  {
    description: "Zástupný text pole pro výběr země.",
    key: "form.country_placeholder",
    namespace: "form",
  },
  {
    description: "Popisek pole pro ulici a číslo domu.",
    key: "form.address",
    namespace: "form",
  },
  {
    description: "Popisek volitelného druhého řádku adresy.",
    key: "form.address_line_2",
    namespace: "form",
  },
  {
    description: "Popisek pole pro město.",
    key: "form.city",
    namespace: "form",
  },
  {
    description: "Popisek pole pro poštovní směrovací číslo.",
    key: "form.postal_code",
    namespace: "form",
  },
  {
    description: "Popisek pole pro volitelnou poznámku zákazníka.",
    key: "form.customer_note",
    namespace: "form",
  },
  {
    description: "Označení povinných formulářových polí.",
    key: "form.required_fields",
    namespace: "form",
  },
  {
    description: "Validační hláška pro příliš krátké jméno.",
    key: "form.validation.first_name_min_length",
    namespace: "form",
  },
  {
    description: "Validační hláška pro příliš krátké příjmení.",
    key: "form.validation.last_name_min_length",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící název firmy.",
    key: "form.validation.company_name_required",
    namespace: "form",
  },
  {
    description: "Validační hláška pro příliš krátký název firmy.",
    key: "form.validation.company_name_min_length",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící identifikační číslo firmy.",
    key: "form.validation.company_id_required",
    namespace: "form",
  },
  {
    description:
      "Validační hláška pro příliš krátké identifikační číslo firmy.",
    key: "form.validation.company_id_min_length",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící daňové identifikační číslo.",
    key: "form.validation.tax_id_required",
    namespace: "form",
  },
  {
    description:
      "Validační hláška pro příliš krátké daňové identifikační číslo.",
    key: "form.validation.tax_id_min_length",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící e-mailovou adresu.",
    key: "form.validation.email_required",
    namespace: "form",
  },
  {
    description: "Validační hláška pro neplatnou e-mailovou adresu.",
    key: "form.validation.email_invalid",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící telefonní číslo.",
    key: "form.validation.phone_required",
    namespace: "form",
  },
  {
    description: "Validační hláška pro neplatné telefonní číslo.",
    key: "form.validation.phone_invalid",
    namespace: "form",
  },
  {
    description:
      "Validační hláška pro telefonní číslo s nedostatečným počtem číslic.",
    key: "form.validation.phone_min_digits",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící zemi.",
    key: "form.validation.country_required",
    namespace: "form",
  },
  {
    description: "Validační hláška pro neplatnou zemi.",
    key: "form.validation.country_invalid",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící ulici a číslo domu.",
    key: "form.validation.address_required",
    namespace: "form",
  },
  {
    description: "Validační hláška pro příliš krátkou ulici a číslo domu.",
    key: "form.validation.address_min_length",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící město.",
    key: "form.validation.city_required",
    namespace: "form",
  },
  {
    description: "Validační hláška pro příliš krátký název města.",
    key: "form.validation.city_min_length",
    namespace: "form",
  },
  {
    description: "Validační hláška pro chybějící poštovní směrovací číslo.",
    key: "form.validation.postal_code_required",
    namespace: "form",
  },
  {
    description: "Validační hláška pro neplatné poštovní směrovací číslo.",
    key: "form.validation.postal_code_invalid",
    namespace: "form",
  },
  {
    description:
      "Validační hláška pro poštovní směrovací číslo s nedostatečným počtem číslic.",
    key: "form.validation.postal_code_min_digits",
    namespace: "form",
  },
] as const satisfies readonly StorefrontTextDefinition[]
