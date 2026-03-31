import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea";
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import NextLink from "next/link";
import type { FormEvent } from "react";
import type { AddressFormState } from "@/components/checkout/checkout.constants";
import { SupportingText } from "@/components/text/supporting-text";

type CheckoutAddressSectionProps = {
  addressForm: AddressFormState;
  countryItems: SelectItem[];
  createAccountConsent: boolean;
  hasCustomerSupportNote: boolean;
  hasDifferentShippingAddress: boolean;
  hasStoredAddress: boolean;
  isBusy: boolean;
  isCompanyPurchase: boolean;
  isSavingAddress: boolean;
  onCreateAccountConsentChange: (value: boolean) => void;
  onCustomerSupportNoteToggle: (value: boolean) => void;
  onDifferentShippingAddressChange: (value: boolean) => void;
  onIsCompanyPurchaseChange: (value: boolean) => void;
  onSaveAddress: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdateAddressField: <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => void;
  ready: boolean;
};

const PRIVATE_PURCHASE_LABEL = "Súkromná osoba";
const COMPANY_PURCHASE_LABEL = "Nakupujem na firmu";

export function CheckoutAddressSection({
  addressForm,
  countryItems,
  createAccountConsent,
  hasCustomerSupportNote,
  hasDifferentShippingAddress,
  hasStoredAddress,
  isBusy,
  isCompanyPurchase,
  isSavingAddress,
  onCreateAccountConsentChange,
  onCustomerSupportNoteToggle,
  onDifferentShippingAddressChange,
  onIsCompanyPurchaseChange,
  onSaveAddress,
  onUpdateAddressField,
  ready,
}: CheckoutAddressSectionProps) {
  return (
    <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-550 font-rubik">
      <header>
        <h2 className="text-xl font-medium text-fg-primary">Vaše údaje</h2>
      </header>

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

      <form
        className="space-y-250 font-inter"
        onSubmit={(event) => {
          void onSaveAddress(event);
        }}
      >
        <RadioGroup
          className="font-rubik"
          onValueChange={(value) => onIsCompanyPurchaseChange(value === "company")}
          orientation="horizontal"
          size="sm"
          value={isCompanyPurchase ? "company" : "private"}
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

        <div className="grid gap-250 md:grid-cols-2">
          <FormInput
            id="checkout-first-name"
            label="Meno"
            name="first_name"
            required
            type="text"
            value={addressForm.firstName}
            onChange={(event) =>
              onUpdateAddressField("firstName", event.target.value)
            }
          />
          <FormInput
            id="checkout-last-name"
            label="Priezvisko"
            name="last_name"
            required
            type="text"
            value={addressForm.lastName}
            onChange={(event) =>
              onUpdateAddressField("lastName", event.target.value)
            }
          />

          {isCompanyPurchase ? (
            <>
              <div className="md:col-span-2">
                <FormInput
                  id="checkout-company"
                  label="Názov firmy"
                  name="company"
                  required
                  type="text"
                  value={addressForm.company}
                  onChange={(event) =>
                    onUpdateAddressField("company", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-250 md:col-span-2 md:grid-cols-3">
                <FormInput
                  id="checkout-company-id"
                  label="IČO"
                  name="company_id"
                  required
                  type="text"
                  value={addressForm.companyId}
                  onChange={(event) =>
                    onUpdateAddressField("companyId", event.target.value)
                  }
                />
                <FormInput
                  id="checkout-tax-id"
                  label="DIČ"
                  name="tax_id"
                  required
                  type="text"
                  value={addressForm.taxId}
                  onChange={(event) =>
                    onUpdateAddressField("taxId", event.target.value)
                  }
                />
                <FormInput
                  id="checkout-vat-id"
                  label="IČ DPH"
                  name="vat_id"
                  type="text"
                  value={addressForm.vatId}
                  onChange={(event) =>
                    onUpdateAddressField("vatId", event.target.value)
                  }
                />
              </div>
            </>
          ) : null}

          <FormInput
            id="checkout-email"
            label="E-mail"
            name="email"
            required
            type="email"
            value={addressForm.email}
            onChange={(event) =>
              onUpdateAddressField("email", event.target.value)
            }
          />
          <FormInput
            id="checkout-phone"
            label="Telefón"
            name="phone"
            required
            type="tel"
            value={addressForm.phone}
            onChange={(event) =>
              onUpdateAddressField("phone", event.target.value)
            }
          />

          <Select
            items={countryItems}
            onValueChange={(details) => {
              onUpdateAddressField(
                "countryCode",
                (details.value[0] ?? "SK").toUpperCase(),
              );
            }}
            size="md"
            value={[addressForm.countryCode]}
          >
            <Select.Label>Krajina</Select.Label>
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="Vyberte krajinu" />
              </Select.Trigger>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {countryItems.map((country) => (
                  <Select.Item item={country} key={country.value}>
                    <Select.ItemText />
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select>
          <FormInput
            id="checkout-address-1"
            label="Ulica a číslo domu"
            name="address_1"
            required
            type="text"
            value={addressForm.address1}
            onChange={(event) =>
              onUpdateAddressField("address1", event.target.value)
            }
          />
          <FormInput
            id="checkout-city"
            label="Mesto"
            name="city"
            required
            type="text"
            value={addressForm.city}
            onChange={(event) =>
              onUpdateAddressField("city", event.target.value)
            }
          />
          <FormInput
            id="checkout-postal-code"
            label="PSČ"
            name="postal_code"
            required
            type="text"
            value={addressForm.postalCode}
            onChange={(event) =>
              onUpdateAddressField("postalCode", event.target.value)
            }
          />

          {hasCustomerSupportNote ? (
            <div className="md:col-span-2">
              <FormTextarea
                id="checkout-customer-note"
                label="Poznámka pre zákaznícku podporu"
                name="customer_note"
                rows={3}
                value={addressForm.customerNote}
                onChange={(event) =>
                  onUpdateAddressField("customerNote", event.target.value)
                }
              />
            </div>
          ) : (
            <div className="md:col-span-2">
              <Button
                className="px-0"
                onClick={() => {
                  onCustomerSupportNoteToggle(true);
                }}
                theme="borderless"
                type="button"
                variant="secondary"
              >
                + Pridať poznámku pre zákaznícku podporu
              </Button>
            </div>
          )}

          <div className="space-y-150 md:col-span-2">
            <FormCheckbox
              checked={hasDifferentShippingAddress}
              label="Poslať na inú adresu"
              onCheckedChange={onDifferentShippingAddressChange}
              size="sm"
            />
            <FormCheckbox
              checked={createAccountConsent}
              label="Chcem sa registrovať a tak získavať výhody"
              onCheckedChange={onCreateAccountConsentChange}
              size="sm"
            />
          </div>

          <div className="flex flex-col flex-wrap items-end justify-center gap-200 md:col-span-2">
            <Button
              disabled={isBusy || !ready}
              isLoading={isSavingAddress}
              type="submit"
              variant="primary"
            >
              Uložiť údaje
            </Button>
            {hasStoredAddress ? (
              <SupportingText className="text-success">
                Údaje sú uložené.
              </SupportingText>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}
