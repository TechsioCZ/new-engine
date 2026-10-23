import type { Meta, StoryObj } from "@storybook/react"
import { useLayoutEffect, useRef, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
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
  const quantityRef = useRef<HTMLInputElement>(null)
  const restoreRef = useRef<HTMLButtonElement>(null)
  const focusRequest = useRef<"restore" | "quantity" | null>(null)
  useLayoutEffect(() => {
    if (focusRequest.current === "restore") restoreRef.current?.focus()
    if (focusRequest.current === "quantity") quantityRef.current?.focus()
    focusRequest.current = null
  }, [removed])
  const locked = readOnly || reviewing
  const count = Number(quantity)
  const valid = Number.isInteger(count) && count >= 1 && count <= 10
  const amount = new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(pricedQuantity * 249)
  const retainedPriceNote = valid
    ? undefined
    : `Ceny platí pro poslední platné množství: ${pricedQuantity} balení. Pro přepočet zadejte platné množství.`
  if (removed)
    return (
      <div className="flex flex-col gap-200">
        <StatusText role="status">Košík je prázdný.</StatusText>
        <Button
          ref={restoreRef}
          variant="secondary"
          onClick={() => {
            focusRequest.current = "quantity"
            setRemoved(false)
          }}
        >
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
              <PriceBlock
                amountLabel={amount}
                state="known"
                taxLabel={retainedPriceNote}
              />
            </LineItem.Price>
          </LineItem.Heading>
          <LineItem.Options>100 ks · pozink · kód MS-008</LineItem.Options>
          <LineItem.Controls>
            <LineItem.Quantity readOnlyLabel={`${quantity} balení`}>
              <QuantityField
                ref={quantityRef}
                helperText={retainedPriceNote}
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
                onClick={() => {
                  focusRequest.current = "restore"
                  setRemoved(true)
                }}
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
            : (retainedPriceNote ??
              "Platné množství přepočítá ceny lokálně. Žádná objednávka nebude odeslána.")
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
    await userEvent.click(input)
    // Let Zag finish its focus/selection frame before replacing the draft.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    await userEvent.clear(input)
    await userEvent.paste("3")
    const amounts = await canvas.findAllByText(/747/)
    await expect(amounts.length).toBeGreaterThan(0)
    for (const draft of ["11", "", "0"]) {
      await userEvent.clear(input)
      if (draft) await userEvent.paste(draft)
      await expect(input).toHaveAttribute("aria-invalid", "true")
      await expect(input).toHaveAccessibleDescription(
        /poslední platné množství: 3 balení/
      )
      await expect(
        canvas.getByRole("button", { name: "Pokračovat k objednávce" })
      ).toBeDisabled()
      await expect(canvas.getAllByText(/747/).length).toBeGreaterThan(0)
    }
    await userEvent.clear(input)
    await userEvent.paste("4")
    await expect(input).not.toHaveAttribute("aria-invalid", "true")
    await expect(canvas.getAllByText(/996/).length).toBeGreaterThan(0)
    await expect(
      canvas.queryByText(/Ceny platí pro poslední/)
    ).not.toBeInTheDocument()
    const remove = canvas.getByRole("button", { name: /Odebrat/ })
    remove.focus()
    await userEvent.keyboard("{Enter}")
    const restore = canvas.getByRole("button", {
      name: "Vrátit produkt do košíku",
    })
    await expect(restore).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("spinbutton")).toHaveFocus()
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
          "Change quantity to recalculate locally, correct a rejected draft, or remove and restore the last item while retaining keyboard context; no order is sent.",
      },
    },
  },
}
export const CartAndRecap: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare an editable cart with a read-only recap that includes selected shipping and payment without exposing mutation controls.",
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

function MultipleItemCart() {
  const products = ["Montážní sada M8", "Podložky M8"]
  const [items, setItems] = useState(products)
  const [removed, setRemoved] = useState<string[]>([])
  const controls = useRef(new Map<string, HTMLButtonElement>())
  const restoreRef = useRef<HTMLButtonElement>(null)
  const destination = useRef<string | "restore" | null>(null)
  useLayoutEffect(() => {
    if (destination.current === "restore") restoreRef.current?.focus()
    else if (destination.current)
      controls.current.get(destination.current)?.focus()
    destination.current = null
  }, [items])
  return (
    <div className="flex w-full max-w-lg flex-col gap-400">
      {items.map((title, index) => (
        <LineItem title={title} key={title}>
          <LineItem.Body>
            <LineItem.Title>{title}</LineItem.Title>
            <LineItem.Options>1 balení · 249 Kč</LineItem.Options>
            <LineItem.Actions>
              <LineItem.Remove
                label="Odebrat"
                ref={(node) => {
                  if (node) controls.current.set(title, node)
                  else controls.current.delete(title)
                }}
                onClick={() => {
                  destination.current =
                    items[index + 1] ?? items[index - 1] ?? "restore"
                  setRemoved([...removed, title])
                  setItems(items.filter((item) => item !== title))
                }}
              />
            </LineItem.Actions>
          </LineItem.Body>
        </LineItem>
      ))}
      {!items.length && (
        <StatusText role="status">Košík je prázdný.</StatusText>
      )}
      {removed.length > 0 && (
        <Button
          ref={restoreRef}
          variant="secondary"
          onClick={() => {
            const title = removed[removed.length - 1]
            if (!title) return
            destination.current = title
            setItems([...items, title])
            setRemoved(removed.slice(0, -1))
          }}
        >
          Vrátit poslední odebraný produkt
        </Button>
      )}
    </div>
  )
}

export const MultipleItems: Story = {
  render: () => <MultipleItemCart />,
  parameters: {
    docs: {
      description: {
        story:
          "Remove either of two products to focus a surviving item, remove the last to focus Undo, then restore the removed product without sending any requests.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = canvas.getByRole("button", {
      name: "Odebrat: Montážní sada M8",
    })
    first.focus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Odebrat: Podložky M8" })
      ).toHaveFocus()
    )
    await userEvent.keyboard("{Enter}")
    await expect(
      canvas.getByRole("button", { name: "Vrátit poslední odebraný produkt" })
    ).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Odebrat: Podložky M8" })
      ).toHaveFocus()
    )
  },
}
