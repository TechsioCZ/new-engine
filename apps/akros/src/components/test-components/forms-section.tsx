import { NumericInput } from "@ui/atoms/numeric-input"
import { FormCheckbox } from "@ui/molecules/form-checkbox"
import { FormInput } from "@ui/molecules/form-input"
import { Select } from "@ui/molecules/select"
import { Slider } from "@ui/molecules/slider"
import { countryItems } from "./data"
import { TestComponentsSection } from "./section"

export function FormsSection() {
  return (
    <TestComponentsSection
      title="Form Komponenty"
      description="`FormInput`, `Select`, `FormCheckbox`, `Slider` a `NumericInput` ve variantách používaných na checkout/my-account screenech."
    >
      <div className="grid grid-cols-1 gap-300 lg:grid-cols-2">
        <FormInput
          helpText="Telefon uvedený při registraci"
          id="customer-phone"
          label="Telefon"
          placeholder="+420 777 000 000"
          size="md"
          validateStatus="default"
        />

        <FormInput
          helpText="Neplatné DIČ"
          id="customer-vat"
          label="DIČ"
          placeholder="CZ12345678"
          size="md"
          validateStatus="error"
        />

        <Select items={countryItems} size="md" validateStatus="default">
          <Select.Label>Země</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Vyberte zemi" />
            </Select.Trigger>
            <Select.ClearTrigger />
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {countryItems.map((item) => (
                <Select.Item item={item} key={item.value}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select>

        <Select items={countryItems} size="md" validateStatus="error">
          <Select.Label>Země</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Vyberte zemi" />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {countryItems.map((item) => (
                <Select.Item item={item} key={item.value}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
          <Select.StatusText showIcon>Vyberte prosím zemi</Select.StatusText>
        </Select>

        <FormCheckbox
          helpText="Souhlasím se zasíláním novinek"
          label="Newsletter"
          size="md"
        />

        <FormCheckbox
          helpText="Potvrďte obchodní podmínky"
          label="Souhlas s podmínkami"
          required
          size="md"
          validateStatus="warning"
        />

        <Slider
          defaultValue={[300, 900]}
          helpText="Cena od 300 Kč do 900 Kč"
          label="Cena (sm)"
          max={2000}
          min={0}
          showValueText
          size="sm"
        />

        <Slider
          defaultValue={[500, 1500]}
          helpText="Cena od 500 Kč do 1500 Kč"
          label="Cena (md)"
          max={3000}
          min={0}
          showMarkers
          showValueText
          size="md"
        />

        <div className="flex flex-col gap-100">
          <p className="text-sm text-fg-secondary">Množství (md)</p>
          <NumericInput defaultValue={1} max={999} min={0} size="md">
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>

        <div className="flex flex-col gap-100">
          <p className="text-sm text-fg-secondary">Množství (sm)</p>
          <NumericInput defaultValue={1} max={999} min={0} size="sm">
            <NumericInput.Control>
              <NumericInput.Input />
              <NumericInput.TriggerContainer>
                <NumericInput.IncrementTrigger />
                <NumericInput.DecrementTrigger />
              </NumericInput.TriggerContainer>
            </NumericInput.Control>
          </NumericInput>
        </div>
      </div>
    </TestComponentsSection>
  )
}
