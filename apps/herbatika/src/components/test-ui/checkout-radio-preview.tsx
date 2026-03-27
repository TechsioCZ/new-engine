import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { RadioCard } from "@techsio/ui-kit/molecules/radio-card";
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group";

type CustomerTypeOption = {
  description: string;
  title: string;
  value: string;
};

type CheckoutCardOption = {
  badge?: string;
  description: string;
  icon: IconType;
  priceLabel: string;
  title: string;
  value: string;
};

const CUSTOMER_TYPE_OPTIONS: CustomerTypeOption[] = [
  {
    value: "private",
    title: "Súkromná osoba",
    description: "Nakupujem pre seba alebo domácnosť.",
  },
  {
    value: "company",
    title: "Nakupujem na firmu",
    description: "Potrebujem IČO, DIČ a fakturačné údaje.",
  },
];

const SHIPPING_OPTIONS: CheckoutCardOption[] = [
  {
    value: "eco-courier",
    title: "Ekologická doprava kuriérom",
    description: "Doručenie na adresu zvyčajne do 24 až 48 hodín.",
    icon: "icon-[mdi--truck-delivery-outline]",
    priceLabel: "+ 2,99 €",
  },
  {
    value: "pickup-point",
    title: "Packeta výdajné miesto",
    description: "Vyzdvihnutie na odbernom mieste podľa vašej dostupnosti.",
    icon: "icon-[mdi--package-variant-closed]",
    priceLabel: "Zadarmo",
    badge: "Obľúbené",
  },
];

const PAYMENT_OPTIONS: CheckoutCardOption[] = [
  {
    value: "card",
    title: "Platba kartou online",
    description: "Apple Pay, Google Pay alebo klasická platobná karta.",
    icon: "icon-[mdi--credit-card-outline]",
    priceLabel: "Zadarmo",
  },
  {
    value: "bank-transfer",
    title: "Bankový prevod",
    description: "Objednávku odošleme po pripísaní platby na účet.",
    icon: "icon-[mdi--bank-outline]",
    priceLabel: "Zadarmo",
  },
];

type CheckoutCustomerTypePreviewProps = {
  defaultValue?: string;
};

export function CheckoutCustomerTypePreview({
  defaultValue = "private",
}: CheckoutCustomerTypePreviewProps) {
  return (
    <RadioGroup defaultValue={defaultValue} orientation="horizontal" size="sm" variant="outline">
      <RadioGroup.Label>Typ nákupu</RadioGroup.Label>
      <RadioGroup.ItemGroup className="rounded-xl bg-highlight p-200">
        {CUSTOMER_TYPE_OPTIONS.map((option) => (
          <RadioGroup.Item
            className="min-w-[14rem] rounded-lg border border-border-secondary bg-surface px-250 py-200"
            key={option.value}
            value={option.value}
          >
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl className="mt-25" />
            <RadioGroup.ItemContent>
              <RadioGroup.ItemText>{option.title}</RadioGroup.ItemText>
            </RadioGroup.ItemContent>
            <RadioGroup.ItemDescription>{option.description}</RadioGroup.ItemDescription>
          </RadioGroup.Item>
        ))}
      </RadioGroup.ItemGroup>
      <RadioGroup.StatusText>
        Táto voľba ovplyvní firemné fakturačné polia a checkout copy.
      </RadioGroup.StatusText>
    </RadioGroup>
  );
}

type CheckoutCardPreviewProps = {
  defaultValue: string;
  label: string;
  options: CheckoutCardOption[];
  statusText: string;
};

function CheckoutCardPreview({
  defaultValue,
  label,
  options,
  statusText,
}: CheckoutCardPreviewProps) {
  return (
    <RadioCard defaultValue={defaultValue} orientation="vertical" size="sm" variant="outline">
      <RadioCard.Label>{label}</RadioCard.Label>
      <div className="grid gap-150">
        {options.map((option) => (
          <RadioCard.Item key={option.value} value={option.value}>
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <div className="flex min-w-0 items-start gap-200">
                <span className="mt-25 text-fg-secondary">
                  <Icon icon={option.icon} size="lg" />
                </span>
                <RadioCard.ItemContent>
                  <div className="flex flex-wrap items-center gap-100">
                    <RadioCard.ItemText>{option.title}</RadioCard.ItemText>
                    {option.badge ? <Badge variant="secondary">{option.badge}</Badge> : null}
                  </div>
                  <RadioCard.ItemDescription>{option.description}</RadioCard.ItemDescription>
                </RadioCard.ItemContent>
              </div>

              <div className="flex shrink-0 items-center gap-150">
                <span
                  className={`text-sm font-medium ${
                    option.priceLabel === "Zadarmo" ? "text-success" : "text-fg-primary"
                  }`}
                >
                  {option.priceLabel}
                </span>
                <RadioCard.ItemIndicator />
              </div>
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
      </div>
      <RadioCard.StatusText>{statusText}</RadioCard.StatusText>
    </RadioCard>
  );
}

type CheckoutShippingPreviewProps = {
  defaultValue?: string;
};

export function CheckoutShippingPreview({
  defaultValue = "eco-courier",
}: CheckoutShippingPreviewProps) {
  return (
    <CheckoutCardPreview
      defaultValue={defaultValue}
      label="Doprava"
      options={SHIPPING_OPTIONS}
      statusText="Výber dopravy už stojí na shared RadioCard contracte."
    />
  );
}

type CheckoutPaymentPreviewProps = {
  defaultValue?: string;
};

export function CheckoutPaymentPreview({
  defaultValue = "card",
}: CheckoutPaymentPreviewProps) {
  return (
    <CheckoutCardPreview
      defaultValue={defaultValue}
      label="Platba"
      options={PAYMENT_OPTIONS}
      statusText="Platobné voľby používajú rovnaký compound pattern ako doprava."
    />
  );
}
