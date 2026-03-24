import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import { SupportingText } from "@/components/text/supporting-text";

const COUNTRY_ITEMS: SelectItem[] = [
  { label: "Slovensko", value: "SK" },
  { label: "Česko", value: "CZ" },
  { label: "Maďarsko", value: "HU" },
  { label: "Rumunsko", value: "RO" },
];

const VARIANT_ITEMS: SelectItem[] = [
  { label: "500 g", value: "500g" },
  { label: "1000 g", value: "1000g" },
  { label: "1500 g", value: "1500g" },
];

const SELECT_NOTES = [
  "Checkout country picker i PDP variant picker sedí na current Select contract.",
  "Nejdřív má rozhodovat token chain, ne nový wrapper nebo app-specific primitive.",
  "Zag states a helper text surface už current shared Select řeší.",
] as const;

export function SelectShowcase() {
  return (
    <div className="space-y-500">
      <section className="grid gap-300 xl:grid-cols-2">
        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Checkout country select</h2>
            <SupportingText>Country picker pro checkout adresu.</SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <Select items={COUNTRY_ITEMS} size="sm" value={["SK"]}>
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
              <Select.StatusText>Vyberte krajinu doručenia.</Select.StatusText>
            </Select>
          </div>
        </article>

        <article className="space-y-300 rounded-md border border-border-secondary bg-surface p-400">
          <div className="space-y-100">
            <h2 className="text-lg font-semibold text-fg-primary">Product variant select</h2>
            <SupportingText>Variant picker pro product detail.</SupportingText>
          </div>
          <div className="rounded-md bg-highlight p-400">
            <Select items={VARIANT_ITEMS} size="sm" value={["500g"]}>
              <Select.Label>Varianta</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Vyberte variantu" />
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {VARIANT_ITEMS.map((item) => (
                    <Select.Item item={item} key={item.value}>
                      <Select.ItemText />
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select>
          </div>
        </article>
      </section>

      <section className="space-y-150 rounded-md border border-border-secondary bg-surface p-400">
        {SELECT_NOTES.map((item, index) => (
          <div className="flex items-start gap-200 rounded-sm bg-highlight px-300 py-250" key={item}>
            <Badge variant="secondary">{String(index + 1)}</Badge>
            <SupportingText className="text-fg-primary">{item}</SupportingText>
          </div>
        ))}
      </section>
    </div>
  );
}
