import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Input } from "@techsio/ui-kit/atoms/input";
import { Tooltip } from "@techsio/ui-kit/atoms/tooltip";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import { SupportingText } from "@/components/text/supporting-text";

const COUNTRY_CODE_ITEMS: SelectItem[] = [
  { label: "+421", value: "+421" },
  { label: "+420", value: "+420" },
  { label: "+48", value: "+48" },
];

type HerbaticaPhoneFieldProps = {
  helperText?: string;
  id?: string;
  label?: string;
  required?: boolean;
  tooltipContent?: string;
  value?: string;
};

export function HerbaticaPhoneField({
  helperText = "Telefon používame len pre doručenie a dôležité informácie k objednávke.",
  id = "test-ui-phone-number",
  label = "Telefónne číslo",
  required = true,
  tooltipContent = "Na toto číslo pošleme informácie k doprave a v prípade potreby vás kontaktuje kuriér.",
  value = "905 123 456",
}: HerbaticaPhoneFieldProps) {
  return (
    <div className="flex flex-col gap-form-field-gap">
      <div className="flex items-center gap-100">
        <label className="text-sm font-medium text-fg-primary" htmlFor={id}>
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
        <Tooltip content={tooltipContent} size="sm" variant="outline">
          <span className="text-fg-secondary">
            <Icon icon="icon-[mdi--information-outline]" size="sm" />
          </span>
        </Tooltip>
      </div>

      <div className="grid gap-150 sm:grid-cols-[8rem_1fr]">
        <Select defaultValue={["+421"]} items={COUNTRY_CODE_ITEMS} size="sm">
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Predvoľba" />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {COUNTRY_CODE_ITEMS.map((item) => (
                <Select.Item item={item} key={item.value}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select>

        <Input
          defaultValue={value}
          id={id}
          placeholder="909 123 456"
          size="sm"
          type="tel"
        />
      </div>

      <SupportingText>{helperText}</SupportingText>
    </div>
  );
}
