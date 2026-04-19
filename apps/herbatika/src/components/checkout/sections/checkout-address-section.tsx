import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group";
import type { SelectItem } from "@techsio/ui-kit/molecules/select";
import NextLink from "next/link";
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form";
import { checkoutFieldValidators } from "@/lib/forms/checkout/address-validators";
import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form";
import { SupportingText } from "@/components/text/supporting-text";

type CheckoutAddressScope = "billing" | "shipping";

type CheckoutAddressSectionProps = {
  checkoutDetailsForm: CheckoutDetailsFormController;
  countryItems: SelectItem[];
  fieldPrefix: string;
  isAuthenticated?: boolean;
  scope: CheckoutAddressScope;
  showCompanyFields?: boolean;
  showCompanyPurchaseToggle?: boolean;
  showContactFields?: boolean;
  showCustomerNote?: boolean;
  showLoginPrompt?: boolean;
  title: string;
};

const PRIVATE_PURCHASE_LABEL = "Súkromná osoba";
const COMPANY_PURCHASE_LABEL = "Nakupujem na firmu";

const resolveAddressFieldName = <K extends keyof CheckoutAddressValues>(
  scope: CheckoutAddressScope,
  field: K,
) => {
  return `${scope}.${field}` as const;
};

export function CheckoutAddressSection({
  checkoutDetailsForm,
  countryItems,
  fieldPrefix,
  isAuthenticated = false,
  scope,
  showCompanyFields = false,
  showCompanyPurchaseToggle = false,
  showContactFields = true,
  showCustomerNote = false,
  showLoginPrompt = false,
  title,
}: CheckoutAddressSectionProps) {
  const scopedValidators = checkoutFieldValidators[scope];

  return (
    <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-550 font-rubik">
      <header>
        <h2 className="text-xl font-medium text-fg-primary">{title}</h2>
      </header>

      {showLoginPrompt && !isAuthenticated ? (
        <div className="flex flex-wrap items-center justify-between gap-250 rounded-sm bg-highlight p-300">
          <div className="space-y-50">
            <p className="text-base font-medium text-fg-primary">
              Už máte v Herbatica účet?
            </p>
            <SupportingText className="text-fg-secondary">
              Prihláste sa pre rýchly nákup a zľavu na ďalšie nákupy
            </SupportingText>
          </div>
          <LinkButton
            as={NextLink}
            href="/account"
            size="md"
            theme="outlined"
            variant="tertiary"
            className="bg-button-bg-outlined-tertiary rounded-button-outlined-tertiary font-normal hover:bg-button-bg-outlined-tertiary-hover"
          >
            Prihlásiť sa
          </LinkButton>
        </div>
      ) : null}

      <div className="space-y-250 font-inter">
        {showCompanyPurchaseToggle ? (
          <RadioGroup
            className="font-rubik"
            id={`${fieldPrefix}-purchase-type`}
            onValueChange={(value) => {
              checkoutDetailsForm.setCompanyPurchase(value === "company");
            }}
            orientation="horizontal"
            size="sm"
            value={checkoutDetailsForm.values.isCompanyPurchase ? "company" : "private"}
            variant="subtle"
          >
            <RadioGroup.Label className="sr-only">Typ nákupu</RadioGroup.Label>
            <RadioGroup.ItemGroup>
              <RadioGroup.Item value="private">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl />
                <RadioGroup.ItemContent>
                  <RadioGroup.ItemText>
                    {PRIVATE_PURCHASE_LABEL}
                  </RadioGroup.ItemText>
                </RadioGroup.ItemContent>
              </RadioGroup.Item>
              <RadioGroup.Item value="company">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl />
                <RadioGroup.ItemContent>
                  <RadioGroup.ItemText>
                    {COMPANY_PURCHASE_LABEL}
                  </RadioGroup.ItemText>
                </RadioGroup.ItemContent>
              </RadioGroup.Item>
            </RadioGroup.ItemGroup>
          </RadioGroup>
        ) : null}

        <div className="grid gap-250 md:grid-cols-2">
          <checkoutDetailsForm.form.AppField
            name={resolveAddressFieldName(scope, "firstName")}
            validators={scopedValidators.firstName}
          >
            {(field) => (
              <field.TextField
                id={`${fieldPrefix}-first-name`}
                label="Meno"
                required
                validationMode="blur"
              />
            )}
          </checkoutDetailsForm.form.AppField>

          <checkoutDetailsForm.form.AppField
            name={resolveAddressFieldName(scope, "lastName")}
            validators={scopedValidators.lastName}
          >
            {(field) => (
              <field.TextField
                id={`${fieldPrefix}-last-name`}
                label="Priezvisko"
                required
                validationMode="blur"
              />
            )}
          </checkoutDetailsForm.form.AppField>

          {showCompanyFields ? (
            <>
              <div className="md:col-span-2">
                <checkoutDetailsForm.form.AppField
                  name={resolveAddressFieldName(scope, "company")}
                  validators={scopedValidators.company}
                >
                  {(field) => (
                    <field.TextField
                      id={`${fieldPrefix}-company`}
                      label="Názov firmy"
                      required
                      validationMode="blur"
                    />
                  )}
                </checkoutDetailsForm.form.AppField>
              </div>

              <div className="grid gap-250 md:col-span-2 md:grid-cols-3">
                <checkoutDetailsForm.form.AppField
                  name={resolveAddressFieldName(scope, "companyId")}
                  validators={scopedValidators.companyId}
                >
                  {(field) => (
                    <field.TextField
                      id={`${fieldPrefix}-company-id`}
                      label="IČO"
                      required
                      validationMode="blur"
                    />
                  )}
                </checkoutDetailsForm.form.AppField>

                <checkoutDetailsForm.form.AppField
                  name={resolveAddressFieldName(scope, "taxId")}
                  validators={scopedValidators.taxId}
                >
                  {(field) => (
                    <field.TextField
                      id={`${fieldPrefix}-tax-id`}
                      label="DIČ"
                      required
                      validationMode="blur"
                    />
                  )}
                </checkoutDetailsForm.form.AppField>

                <checkoutDetailsForm.form.AppField
                  name={resolveAddressFieldName(scope, "vatId")}
                >
                  {(field) => (
                    <field.TextField
                      id={`${fieldPrefix}-vat-id`}
                      label="IČ DPH"
                      validationMode="blur"
                    />
                  )}
                </checkoutDetailsForm.form.AppField>
              </div>
            </>
          ) : null}

          {showContactFields ? (
            <>
              <checkoutDetailsForm.form.AppField
                name={resolveAddressFieldName(scope, "email")}
                validators={checkoutFieldValidators.shipping.email}
              >
                {(field) => (
                  <field.TextField
                    autoComplete="email"
                    id={`${fieldPrefix}-email`}
                    label="E-mail"
                    required
                    type="email"
                    validationMode="blur"
                  />
                )}
              </checkoutDetailsForm.form.AppField>

              <checkoutDetailsForm.form.AppField
                name={resolveAddressFieldName(scope, "phone")}
                validators={checkoutFieldValidators.shipping.phone}
              >
                {(field) => (
                  <field.TextField
                    autoComplete="tel"
                    id={`${fieldPrefix}-phone`}
                    label="Telefón"
                    required
                    type="tel"
                    validationMode="blur"
                  />
                )}
              </checkoutDetailsForm.form.AppField>
            </>
          ) : null}

          <checkoutDetailsForm.form.AppField
            name={resolveAddressFieldName(scope, "countryCode")}
            validators={scopedValidators.countryCode}
          >
            {(field) => (
              <field.SelectField
                id={`${fieldPrefix}-country`}
                items={countryItems}
                label="Krajina"
                placeholder="Vyberte krajinu"
                required
                validationMode="blur"
              />
            )}
          </checkoutDetailsForm.form.AppField>

          <checkoutDetailsForm.form.AppField
            name={resolveAddressFieldName(scope, "address1")}
            validators={scopedValidators.address1}
          >
            {(field) => (
              <field.TextField
                id={`${fieldPrefix}-address-1`}
                label="Ulica a číslo domu"
                required
                validationMode="blur"
              />
            )}
          </checkoutDetailsForm.form.AppField>

          <checkoutDetailsForm.form.AppField
            name={resolveAddressFieldName(scope, "city")}
            validators={scopedValidators.city}
          >
            {(field) => (
              <field.TextField
                id={`${fieldPrefix}-city`}
                label="Mesto"
                required
                validationMode="blur"
              />
            )}
          </checkoutDetailsForm.form.AppField>

          <checkoutDetailsForm.form.AppField
            name={resolveAddressFieldName(scope, "postalCode")}
            validators={scopedValidators.postalCode}
          >
            {(field) => (
              <field.TextField
                id={`${fieldPrefix}-postal-code`}
                label="PSČ"
                required
                validationMode="blur"
              />
            )}
          </checkoutDetailsForm.form.AppField>

          {showCustomerNote ? (
            <div className="md:col-span-2">
              <checkoutDetailsForm.form.AppField
                name={resolveAddressFieldName(scope, "customerNote")}
              >
                {(field) => (
                  <field.TextareaField
                    className="min-h-14"
                    id={`${fieldPrefix}-customer-note`}
                    label="Voliteľná poznámka pre zákaznícku podporu"
                    resize="auto"
                    rows={3}
                    size="sm"
                    validationMode="none"
                  />
                )}
              </checkoutDetailsForm.form.AppField>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
