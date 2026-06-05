import type { SelectItem } from "@techsio/ui-kit/molecules/select";
import {
  type CheckoutAddressScope,
  resolveCheckoutAddressFieldName,
} from "@/components/checkout/checkout-address.utils";
import type { CheckoutDetailsFormController } from "@/components/checkout/use-checkout-details-form";
import { checkoutFieldValidators } from "@/lib/forms/checkout/address-validators";
import { CheckoutLoginPrompt } from "./checkout-login-prompt";
import { CheckoutPurchaseTypeToggle } from "./checkout-purchase-type-toggle";

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

      {showLoginPrompt && !isAuthenticated ? <CheckoutLoginPrompt /> : null}

      <div className="space-y-250 font-inter">
        {showCompanyPurchaseToggle ? (
          <CheckoutPurchaseTypeToggle
            id={`${fieldPrefix}-purchase-type`}
            isCompanyPurchase={checkoutDetailsForm.values.isCompanyPurchase}
            onValueChange={checkoutDetailsForm.setCompanyPurchase}
          />
        ) : null}

        <div className="grid gap-250 md:grid-cols-2">
          <checkoutDetailsForm.form.AppField
            name={resolveCheckoutAddressFieldName(scope, "firstName")}
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
            name={resolveCheckoutAddressFieldName(scope, "lastName")}
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
                  name={resolveCheckoutAddressFieldName(scope, "company")}
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
                  name={resolveCheckoutAddressFieldName(scope, "companyId")}
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
                  name={resolveCheckoutAddressFieldName(scope, "taxId")}
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
                  name={resolveCheckoutAddressFieldName(scope, "vatId")}
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
                name={resolveCheckoutAddressFieldName(scope, "email")}
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
                name={resolveCheckoutAddressFieldName(scope, "phone")}
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
            name={resolveCheckoutAddressFieldName(scope, "countryCode")}
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
            name={resolveCheckoutAddressFieldName(scope, "address1")}
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
            name={resolveCheckoutAddressFieldName(scope, "city")}
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
            name={resolveCheckoutAddressFieldName(scope, "postalCode")}
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
                name={resolveCheckoutAddressFieldName(scope, "customerNote")}
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
