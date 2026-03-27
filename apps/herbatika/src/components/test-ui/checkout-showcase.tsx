import NextLink from "next/link";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import { SupportingText } from "@/components/text/supporting-text";
import {
  CheckoutCustomerTypePreview,
  CheckoutPaymentPreview,
  CheckoutShippingPreview,
} from "./checkout-radio-preview";

const COUNTRY_ITEMS: SelectItem[] = [
  { label: "Slovensko", value: "SK" },
  { label: "Česko", value: "CZ" },
];

const CHECKOUT_NOTES = [
  "Výber dopravy a platby už sedí na shared RadioCard contracte, ďalší krok je hlavne dotiahnuť vizuálnu paritu s Figmou.",
  "Typ nákupu je jednoduchší shared RadioGroup; app-specific zostáva shell, summary panel a obsahová skladba checkoutu.",
  "StatusText a SupportingText pokrývajú validačné a helper surface bez starého driftu okolo ErrorText alebo ExtraText.",
] as const;

export function CheckoutShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Checkout form family</h2>
            <SupportingText>
              Adresné polia, helper texty a typ nákupu nad current shared form a radio
              contracts.
            </SupportingText>
          </div>

          <div className="space-y-250 rounded-md bg-highlight p-400">
            <CheckoutCustomerTypePreview />

            <div className="grid gap-250 md:grid-cols-2">
              <FormInput defaultValue="Ján" id="checkout-first-name-preview" label="Meno" required />
              <FormInput
                defaultValue="Novák"
                id="checkout-last-name-preview"
                label="Priezvisko"
                required
              />
            </div>

            <Select defaultValue={["SK"]} items={COUNTRY_ITEMS} size="sm">
              <Select.Label>Krajina</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Vyberte krajinu" />
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {COUNTRY_ITEMS.map((item) => (
                    <Select.Item item={item} key={item.value}>
                      <Select.ItemText />
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select>

            <FormCheckbox
              defaultChecked
              label="Súhlasím so zasielaním marketingových informácií"
              size="sm"
            />

            <SupportingText className="text-fg-secondary">
              Povinné polia, helper copy a sekundárne texty zostávajú app-level obsah, nie
              shared API.
            </SupportingText>
          </div>
        </article>

        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Shipping / payment radios</h2>
            <SupportingText>
              Checkout výberové bloky po prechode z ručných button rows na shared compound
              radio primitives.
            </SupportingText>
          </div>

          <div className="space-y-250 rounded-md bg-highlight p-400">
            <CheckoutShippingPreview />
            <CheckoutPaymentPreview />
          </div>
        </article>
      </section>

      <section className="grid gap-300 xl:grid-cols-2">
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Summary surface</h2>
            <SupportingText>
              Checkout summary riadky zostávajú app composition bez potreby ďalšej shared
              komponenty.
            </SupportingText>
          </div>
          <div className="space-y-150 rounded-md bg-highlight p-400">
            <div className="flex items-center justify-between gap-200 border-b border-border-primary pb-150">
              <span className="text-fg-secondary">Cena produktov</span>
              <span className="text-md font-medium text-fg-primary">49 €</span>
            </div>
            <div className="flex items-center justify-between gap-200 border-b border-border-primary pb-150">
              <span className="text-fg-secondary">Ekologická doprava kuriérom</span>
              <span className="text-md font-medium text-fg-primary">2,99 €</span>
            </div>
            <div className="flex items-center justify-between gap-200 pt-100">
              <span className="text-md font-semibold text-fg-primary">Spolu s DPH</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-fg-primary">51,99 €</p>
                <SupportingText className="text-fg-secondary">bez DPH: 42,27 €</SupportingText>
              </div>
            </div>
          </div>
        </article>

        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Feedback contract</h2>
            <SupportingText>
              Error a success surface po odstránení starého ErrorText alebo ExtraText driftu.
            </SupportingText>
          </div>
          <div className="space-y-200 rounded-md bg-highlight p-400">
            <StatusText showIcon status="error">
              Vyberte dopravu pred dokončením objednávky.
            </StatusText>
            <StatusText showIcon status="success">
              Údaje sú uložené.
            </StatusText>
            <SupportingText className="text-fg-secondary">
              Potvrdzujem, že som sa oboznámil s obchodnými podmienkami a ochranou osobných
              údajov.
            </SupportingText>
            <LinkButton as={NextLink} className="px-0 underline" href="#" size="sm" theme="unstyled">
              Upraviť
            </LinkButton>
          </div>
        </article>
      </section>

      <section className="space-y-150 rounded-md border border-border-secondary bg-surface p-400">
        {CHECKOUT_NOTES.map((item, index) => (
          <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
            <Badge variant="secondary">{String(index + 1)}</Badge>
            <SupportingText className="text-fg-primary">{item}</SupportingText>
          </div>
        ))}
      </section>
    </div>
  );
}
