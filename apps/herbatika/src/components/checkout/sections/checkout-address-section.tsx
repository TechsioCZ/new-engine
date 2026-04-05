import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea";
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import NextLink from "next/link";
import type { AddressFormState } from "@/components/checkout/checkout.constants";
import { SupportingText } from "@/components/text/supporting-text";

type CheckoutAddressSectionProps = {
  addressForm: AddressFormState;
  countryItems: SelectItem[];
  fieldPrefix: string;
  isAuthenticated?: boolean;
  isCompanyPurchase?: boolean;
  onIsCompanyPurchaseChange?: (value: boolean) => void;
  onUpdateAddressField: <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => void;
  showCompanyFields?: boolean;
  showCompanyPurchaseToggle?: boolean;
  showContactFields?: boolean;
  showCustomerNote?: boolean;
  showLoginPrompt?: boolean;
  title: string;
};

const PRIVATE_PURCHASE_LABEL = "Súkromná osoba";
const COMPANY_PURCHASE_LABEL = "Nakupujem na firmu";

export function CheckoutAddressSection({
  addressForm,
  countryItems,
  fieldPrefix,
  isAuthenticated = false,
  isCompanyPurchase = false,
  onIsCompanyPurchaseChange,
  onUpdateAddressField,
  showCompanyFields = false,
  showCompanyPurchaseToggle = false,
  showContactFields = true,
  showCustomerNote = false,
  showLoginPrompt = false,
  title,
}: CheckoutAddressSectionProps) {
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
        {showCompanyPurchaseToggle && onIsCompanyPurchaseChange ? (
          <RadioGroup
            className="font-rubik"
            onValueChange={(value) =>
              onIsCompanyPurchaseChange(value === "company")
            }
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
        ) : null}

        <div className="grid gap-250 md:grid-cols-2">
          <FormInput
            id={`${fieldPrefix}-first-name`}
            label="Meno"
            name={`${fieldPrefix}_first_name`}
            required
            type="text"
            value={addressForm.firstName}
            onChange={(event) =>
              onUpdateAddressField("firstName", event.target.value)
            }
          />
          <FormInput
            id={`${fieldPrefix}-last-name`}
            label="Priezvisko"
            name={`${fieldPrefix}_last_name`}
            required
            type="text"
            value={addressForm.lastName}
            onChange={(event) =>
              onUpdateAddressField("lastName", event.target.value)
            }
          />

          {showCompanyFields ? (
            <>
              <div className="md:col-span-2">
                <FormInput
                  id={`${fieldPrefix}-company`}
                  label="Názov firmy"
                  name={`${fieldPrefix}_company`}
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
                  id={`${fieldPrefix}-company-id`}
                  label="IČO"
                  name={`${fieldPrefix}_company_id`}
                  required
                  type="text"
                  value={addressForm.companyId}
                  onChange={(event) =>
                    onUpdateAddressField("companyId", event.target.value)
                  }
                />
                <FormInput
                  id={`${fieldPrefix}-tax-id`}
                  label="DIČ"
                  name={`${fieldPrefix}_tax_id`}
                  required
                  type="text"
                  value={addressForm.taxId}
                  onChange={(event) =>
                    onUpdateAddressField("taxId", event.target.value)
                  }
                />
                <FormInput
                  id={`${fieldPrefix}-vat-id`}
                  label="IČ DPH"
                  name={`${fieldPrefix}_vat_id`}
                  type="text"
                  value={addressForm.vatId}
                  onChange={(event) =>
                    onUpdateAddressField("vatId", event.target.value)
                  }
                />
              </div>
            </>
          ) : null}

          {showContactFields ? (
            <>
              <FormInput
                id={`${fieldPrefix}-email`}
                label="E-mail"
                name={`${fieldPrefix}_email`}
                required
                type="email"
                value={addressForm.email}
                onChange={(event) =>
                  onUpdateAddressField("email", event.target.value)
                }
              />
              <FormInput
                id={`${fieldPrefix}-phone`}
                label="Telefón"
                name={`${fieldPrefix}_phone`}
                required
                type="tel"
                value={addressForm.phone}
                onChange={(event) =>
                  onUpdateAddressField("phone", event.target.value)
                }
              />
            </>
          ) : null}

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
            id={`${fieldPrefix}-address-1`}
            label="Ulica a číslo domu"
            name={`${fieldPrefix}_address_1`}
            required
            type="text"
            value={addressForm.address1}
            onChange={(event) =>
              onUpdateAddressField("address1", event.target.value)
            }
          />
          <FormInput
            id={`${fieldPrefix}-city`}
            label="Mesto"
            name={`${fieldPrefix}_city`}
            required
            type="text"
            value={addressForm.city}
            onChange={(event) =>
              onUpdateAddressField("city", event.target.value)
            }
          />
          <FormInput
            id={`${fieldPrefix}-postal-code`}
            label="PSČ"
            name={`${fieldPrefix}_postal_code`}
            required
            type="text"
            value={addressForm.postalCode}
            onChange={(event) =>
              onUpdateAddressField("postalCode", event.target.value)
            }
          />

          {showCustomerNote ? (
            <div className="md:col-span-2">
              <FormTextarea
                id={`${fieldPrefix}-customer-note`}
                label="Voliteľná poznámka pre zákaznícku podporu"
                name={`${fieldPrefix}_customer_note`}
                rows={3}
                value={addressForm.customerNote}
                resize="auto"
                size="sm"
                className="min-h-14"
                onChange={(event) =>
                  onUpdateAddressField("customerNote", event.target.value)
                }
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
