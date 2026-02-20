import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import type { AddressFormState } from "@/components/checkout/checkout.constants";

type CheckoutAddressSectionProps = {
  acceptTermsConsent: boolean;
  addressForm: AddressFormState;
  countryItems: SelectItem[];
  createAccountConsent: boolean;
  hasStoredAddress: boolean;
  isBusy: boolean;
  isSavingAddress: boolean;
  onAcceptTermsConsentChange: (value: boolean) => void;
  onCreateAccountConsentChange: (value: boolean) => void;
  onSaveAddress: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdateAddressField: <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => void;
  ready: boolean;
};

export function CheckoutAddressSection({
  acceptTermsConsent,
  addressForm,
  countryItems,
  createAccountConsent,
  hasStoredAddress,
  isBusy,
  isSavingAddress,
  onAcceptTermsConsentChange,
  onCreateAccountConsentChange,
  onSaveAddress,
  onUpdateAddressField,
  ready,
}: CheckoutAddressSectionProps) {
  return (
    <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
      <header className="flex flex-wrap items-center justify-between gap-200">
        <h2 className="text-lg font-semibold text-fg-primary">1. Fakturačné a doručovacie údaje</h2>
        <Badge variant={hasStoredAddress ? "success" : "info"}>
          {hasStoredAddress ? "Uložené" : "Povinné"}
        </Badge>
      </header>

      <form className="grid gap-300 md:grid-cols-2" onSubmit={(event) => {
        void onSaveAddress(event);
      }}>
        <FormInput
          id="checkout-email"
          label="Email"
          name="email"
          required
          type="email"
          value={addressForm.email}
          onChange={(event) => onUpdateAddressField("email", event.target.value)}
        />
        <FormInput
          id="checkout-phone"
          label="Telefón"
          name="phone"
          type="tel"
          value={addressForm.phone}
          onChange={(event) => onUpdateAddressField("phone", event.target.value)}
        />
        <FormInput
          id="checkout-first-name"
          label="Meno"
          name="first_name"
          required
          type="text"
          value={addressForm.firstName}
          onChange={(event) => onUpdateAddressField("firstName", event.target.value)}
        />
        <FormInput
          id="checkout-last-name"
          label="Priezvisko"
          name="last_name"
          required
          type="text"
          value={addressForm.lastName}
          onChange={(event) => onUpdateAddressField("lastName", event.target.value)}
        />
        <FormInput
          id="checkout-company"
          label="Firma"
          name="company"
          type="text"
          value={addressForm.company}
          onChange={(event) => onUpdateAddressField("company", event.target.value)}
        />
        <FormInput
          id="checkout-address-1"
          label="Ulica"
          name="address_1"
          required
          type="text"
          value={addressForm.address1}
          onChange={(event) => onUpdateAddressField("address1", event.target.value)}
        />
        <FormInput
          id="checkout-address-2"
          label="Ulica 2"
          name="address_2"
          type="text"
          value={addressForm.address2}
          onChange={(event) => onUpdateAddressField("address2", event.target.value)}
        />
        <FormInput
          id="checkout-city"
          label="Mesto"
          name="city"
          required
          type="text"
          value={addressForm.city}
          onChange={(event) => onUpdateAddressField("city", event.target.value)}
        />
        <FormInput
          id="checkout-postal-code"
          label="PSČ"
          name="postal_code"
          required
          type="text"
          value={addressForm.postalCode}
          onChange={(event) => onUpdateAddressField("postalCode", event.target.value)}
        />
        <Select
          items={countryItems}
          onValueChange={(details) => {
            onUpdateAddressField("countryCode", (details.value[0] ?? "SK").toUpperCase());
          }}
          size="sm"
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

        <div className="space-y-200 md:col-span-2">
          <FormCheckbox
            checked={createAccountConsent}
            label="Chcem si vytvoriť účet pre rýchlejší nákup nabudúce."
            onCheckedChange={onCreateAccountConsentChange}
            size="sm"
          />
          <FormCheckbox
            checked={acceptTermsConsent}
            label="Súhlasím s obchodnými podmienkami."
            onCheckedChange={onAcceptTermsConsentChange}
            required
            size="sm"
          />
        </div>

        <div className="flex justify-end md:col-span-2">
          <Button
            disabled={isBusy || !ready}
            isLoading={isSavingAddress}
            type="submit"
            variant="primary"
          >
            Uložiť údaje
          </Button>
        </div>
      </form>
    </section>
  );
}
