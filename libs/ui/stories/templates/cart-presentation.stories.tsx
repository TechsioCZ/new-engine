import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { PriceBlock } from "../../src/molecules/price-block"
import { QuantityField } from "../../src/molecules/quantity-field"
import { TotalsSummary } from "../../src/molecules/totals-summary"
import { LineItem } from "../../src/organisms/line-item"

function CartExample({ readOnly = false }: { readOnly?: boolean }) {
  const [quantity, setQuantity] = useState("2")
  const [pricedQuantity, setPricedQuantity] = useState(2)
  const [removed, setRemoved] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const locked = readOnly || reviewing
  const count = Number(quantity)
  const valid = Number.isInteger(count) && count >= 1 && count <= 10
  const amount = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(pricedQuantity * 249)
  if (removed)
    return (
      <div className="flex flex-col gap-200">
        <StatusText role="status">Košík je prázdný.</StatusText>
        <Button variant="secondary" onClick={() => setRemoved(false)}>
          Vrátit produkt do košíku
        </Button>
      </div>
    )
  const title = "Montážní sada M8"
  return (
    <div className="flex w-xl max-w-full flex-col gap-400">
      <LineItem title={title} readOnly={locked}>
        <LineItem.Body>
          <LineItem.Heading>
            <LineItem.Title>{title}</LineItem.Title>
            <LineItem.Price>
              <PriceBlock amountLabel={amount} state="known" />
            </LineItem.Price>
          </LineItem.Heading>
          <LineItem.Options>100 ks · pozink · kód MS-008</LineItem.Options>
          <LineItem.Controls>
            <LineItem.Quantity readOnlyLabel={`${quantity} balení`}>
              <QuantityField
                hideLabel
                label={`Množství: ${title}`}
                min={1}
                max={10}
                readOnly={locked}
                error={valid ? undefined : "Zadejte celé množství od 1 do 10."}
                onValueChange={(details) => {
                  setQuantity(details.value)
                  const next = Number(details.value)
                  if (Number.isInteger(next) && next >= 1 && next <= 10)
                    setPricedQuantity(next)
                }}
                size="sm"
                unitLabel="balení"
                value={quantity}
              />
            </LineItem.Quantity>
            <LineItem.Actions>
              <LineItem.Remove
                label="Odebrat"
                onClick={() => setRemoved(true)}
              />
            </LineItem.Actions>
          </LineItem.Controls>
        </LineItem.Body>
      </LineItem>
      <TotalsSummary
        rows={[
          { id: "goods", label: "Zboží", value: amount },
          {
            id: "shipping",
            label: "Doprava",
            value: locked ? "89 Kč" : "Zvolte dopravu",
          },
        ]}
        totalLabel={locked ? "Celkem včetně DPH" : "Mezisoučet včetně DPH"}
        totalValue={
          locked
            ? new Intl.NumberFormat("cs-CZ", {
                style: "currency",
                currency: "CZK",
                maximumFractionDigits: 0,
              }).format(pricedQuantity * 249 + 89)
            : amount
        }
        footer={
          locked
            ? "Doručení na adresu, platba kartou."
            : "Množství a ceny se přepočítávají lokálně. Žádná objednávka nebude odeslána."
        }
        actions={
          readOnly ? undefined : reviewing ? (
            <Button variant="secondary" onClick={() => setReviewing(false)}>
              Upravit košík
            </Button>
          ) : (
            <Button disabled={!valid} onClick={() => setReviewing(true)}>
              Pokračovat k objednávce
            </Button>
          )
        }
      />
    </div>
  )
}

const meta: Meta<typeof CartExample> = {
  title: "Templates/CartPresentation",
  component: CartExample,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Kompozice LineItem, QuantityField, PriceBlock a TotalsSummary pro košík a rekapitulaci. Použijte pro košík s lokálně přepočítanými částkami a rekapitulaci bez úprav; pro samotnou cenu použijte PriceBlock. Ukázka neodesílá objednávky ani síťové požadavky.",
      },
    },
  },
  args: { readOnly: false },
  argTypes: { readOnly: { control: "boolean" } },
}
export default meta
type Story = StoryObj<typeof CartExample>

export const Playground: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    if (args.readOnly) {
      await expect(canvas.queryByRole("spinbutton")).not.toBeInTheDocument()
      await expect(canvas.getByText("2 balení")).toBeVisible()
      await expect(canvas.getByText("Celkem včetně DPH")).toBeVisible()
      await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
      return
    }
    const input = canvas.getByRole("spinbutton")
    await userEvent.clear(input)
    await userEvent.type(input, "3")
    const amounts = await canvas.findAllByText(/747/)
    await expect(amounts.length).toBeGreaterThan(0)
    await userEvent.click(
      canvas.getByRole("button", { name: "Pokračovat k objednávce" })
    )
    await expect(
      canvas.getByRole("button", { name: "Upravit košík" })
    ).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Upravit košík" }))
  },
  parameters: {
    docs: {
      description: {
        story:
          "Adjust the controls to explore cart presentation using realistic content and immediately visible results.",
      },
    },
  },
}
export const CartAndRecap: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare cart and recap in cart presentation to choose a suitable presentation for real product content.",
      },
    },
  },

  render: () => (
    <VariantContainer>
      <VariantGroup
        fullWidth
        title="Košík: úprava množství a nevybraná doprava"
      >
        <CartExample />
      </VariantGroup>
      <VariantGroup
        fullWidth
        title="Rekapitulace: hotové částky a množství bez ovládání"
      >
        <CartExample readOnly />
      </VariantGroup>
    </VariantContainer>
  ),
}
