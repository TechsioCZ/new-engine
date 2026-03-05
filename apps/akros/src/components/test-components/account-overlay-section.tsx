import { Button } from "@ui/atoms/button"
import { Accordion } from "@ui/molecules/accordion"
import { Dialog } from "@ui/molecules/dialog"
import { Popover } from "@ui/molecules/popover"
import { TestComponentsSection } from "./section"

export function AccountOverlaySection() {
  return (
    <TestComponentsSection
      title="Accordion + Mini Cart Overlay"
      description="My-account sekce přes `Accordion` a mini-košík pattern přes `Popover` / `Dialog`."
    >
      <div className="grid grid-cols-1 gap-400 lg:grid-cols-2">
        <Accordion defaultValue={["fakturacni"]} size="md" variant="borderless">
          <Accordion.Item value="kontaktni">
            <Accordion.Header>
              <Accordion.Title>Kontaktní údaje</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>
              <p className="text-sm text-fg-secondary">Telefon, e-mail a kontaktní osoba.</p>
            </Accordion.Content>
          </Accordion.Item>

          <Accordion.Item value="fakturacni">
            <Accordion.Header>
              <Accordion.Title>Fakturační údaje</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>
              <p className="text-sm text-fg-secondary">IČO, DIČ, název firmy a adresa.</p>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>

        <div className="flex items-start gap-200">
          <Popover
            id="mini-cart-popover"
            description="Rychlý náhled položek"
            title="Mini košík"
            trigger="Popover mini košík"
          >
            <div className="flex flex-col gap-100">
              <p className="text-sm">Lehátko Akros 120x60</p>
              <p className="text-sm">Lehátko Akros 140x70</p>
              <Button size="sm" theme="solid" variant="primary">
                Pokračovat do košíku
              </Button>
            </div>
          </Popover>

          <Dialog
            description="Stejný pattern může být i jako modal."
            title="Mini košík"
            triggerText="Dialog mini košík"
          >
            <div className="flex flex-col gap-100">
              <p className="text-sm">2 položky v košíku</p>
              <Button theme="solid" variant="primary">
                Pokračovat do košíku
              </Button>
            </div>
          </Dialog>
        </div>
      </div>
    </TestComponentsSection>
  )
}
