import NextLink from "next/link";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import { SupportingText } from "@/components/text/supporting-text";

const COUNTRY_ITEMS: SelectItem[] = [
  { label: "Slovensko", value: "SK" },
  { label: "Česko", value: "CZ" },
];

const CHECKOUT_NOTES = [
  "Checkout selection rows jsou zatím app composition nad shared primitives, ne nový shared component.",
  "Form family sedí na current FormInput/FormCheckbox/Select contract a teď je potřeba hlavně appearance cleanup.",
  "StatusText + SupportingText dohromady řeší to, co dřív v appce dělal ErrorText/ExtraText drift.",
] as const;

function SelectionRow({
  title,
  subtitle,
  priceLabel,
  selected = false,
  icon,
}: {
  title: string;
  subtitle: string;
  priceLabel: string;
  selected?: boolean;
  icon: IconType;
}) {
  return (
    <Button
      className="w-full rounded-sm border border-border-primary bg-surface p-0 text-left data-[selected=true]:border-success"
      data-selected={selected}
      theme="unstyled"
      type="button"
    >
      <div className="w-full space-y-150 px-550 py-400">
        <div className="flex flex-wrap items-center justify-between gap-200">
          <div className="flex min-w-0 items-center gap-150">
            <span
              className="flex size-550 items-center justify-center rounded-full border border-fg-placeholder data-[selected=true]:border-success"
              data-selected={selected}
            >
              <span
                className="size-250 rounded-full bg-success opacity-0 data-[selected=true]:opacity-100"
                data-selected={selected}
              />
            </span>
            <Icon
              className={`text-md ${selected ? "text-primary" : "text-fg-secondary"}`}
              icon={icon}
            />
            <p className="truncate text-md font-medium text-fg-primary">{title}</p>
          </div>
          <p
            className={`text-md font-medium ${priceLabel === "Zadarmo" ? "text-success" : "text-fg-primary"}`}
          >
            {priceLabel}
          </p>
        </div>
        <SupportingText className="pl-700 text-fg-secondary">{subtitle}</SupportingText>
      </div>
    </Button>
  );
}

export function CheckoutShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Checkout form family</h2>
            <SupportingText>Adresní a souhlasové prvky nad current shared form contracts.</SupportingText>
          </div>
          <div className="space-y-250 rounded-md bg-highlight p-400">
            <FormInput defaultValue="Ján" id="checkout-first-name-preview" label="Meno" required />
            <FormInput defaultValue="Novák" id="checkout-last-name-preview" label="Priezvisko" required />
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
              * povinné polia a doplňujúce helper texty majú byť app-local supporting copy.
            </SupportingText>
          </div>
        </article>

        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Shipping / payment rows</h2>
            <SupportingText>Dnešní checkout selection rows jako app composition nad shared primitives.</SupportingText>
          </div>
          <div className="space-y-150 rounded-md bg-highlight p-400">
            <SelectionRow
              icon="icon-[mdi--truck-delivery-outline]"
              priceLabel="+ 2,99 €"
              selected
              subtitle="Zvolená možnosť"
              title="Ekologická doprava kuriérom"
            />
            <SelectionRow
              icon="icon-[mdi--credit-card-outline]"
              priceLabel="Zadarmo"
              subtitle="Dostupná možnosť"
              title="Platba kartou, Google Pay alebo Apple Pay"
            />
          </div>
        </article>
      </section>

      <section className="grid gap-300 xl:grid-cols-2">
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Summary surface</h2>
            <SupportingText>Checkout summary řádky jako app composition bez potřeby nové shared komponenty.</SupportingText>
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
            <SupportingText>Error/success surface po odstranění ErrorText/ExtraText.</SupportingText>
          </div>
          <div className="space-y-200 rounded-md bg-highlight p-400">
            <StatusText showIcon status="error">
              Vyberte dopravu pred dokončením objednávky.
            </StatusText>
            <StatusText showIcon status="success">
              Údaje sú uložené.
            </StatusText>
            <SupportingText className="text-fg-secondary">
              Potvrdzujem, že som sa oboznámil s obchodnými podmienkami a ochranou osobných údajov.
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
