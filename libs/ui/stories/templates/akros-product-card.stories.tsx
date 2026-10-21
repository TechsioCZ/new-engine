import type { Meta, StoryObj } from "@storybook/react"
import { type ReactNode, useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Link } from "../../src/atoms/link"
import { LinkButton } from "../../src/atoms/link-button"
import { Dialog } from "../../src/molecules/dialog"
import { StatusText } from "../../src/atoms/status-text"
import {
  AvailabilityStatus,
  type AvailabilityStatusProps,
} from "../../src/molecules/availability-status"
import {
  PriceBlock,
  type PriceBlockProps,
} from "../../src/molecules/price-block"
import { ProductCard } from "../../src/molecules/product-card"
import { QuantityField } from "../../src/molecules/quantity-field"
import "./akros-product-card.css"

const productImage = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 373 282"><rect width="373" height="282" fill="#f5f5f5"/><path d="M126 86h121l31 55-31 55H126l-31-55z" fill="#969696" stroke="#464646" stroke-width="8"/><circle cx="186" cy="141" r="35" fill="#f5f5f5" stroke="#464646" stroke-width="8"/></svg>',
)}`

type AkrosCardExampleProps = {
  name: string
  description: string
  price: PriceBlockProps
  availability: AvailabilityStatusProps
  badgeLabel?: string
  imageAvailable: boolean
  action: "add" | "pending" | "disabled" | "detail" | "variants"
  actionContent?: ReactNode
  onAddToCart: (quantity?: string) => void
}

function AkrosCardExample({
  name,
  description,
  price,
  availability,
  badgeLabel,
  imageAvailable,
  action,
  actionContent,
  onAddToCart,
}: AkrosCardExampleProps) {
  const detailHref = "#product-preview"
  const [detailOpen, setDetailOpen] = useState(false)
  const previewDetail = (event: { preventDefault: () => void }) => {
    event.preventDefault()
    setDetailOpen(true)
  }
  const pending = action === "pending"
  const detailAction = action === "detail" || action === "variants"

  return (
    <article data-akros-card-example>
      <ProductCard className="h-full" layout="column">
        <div className="relative">
          <Link
            aria-label={`Detail produktu: ${name}`}
            className="block"
            data-akros-card-media
            href={detailHref}
            onClick={previewDetail}
          >
            {imageAvailable ? (
              <ProductCard.Image
                alt=""
                className="object-contain"
                src={productImage}
              />
            ) : (
              <div
                data-akros-card-placeholder
                className="flex items-center justify-center bg-fill-surface p-200 text-center text-fg-primary"
              >
                Fotografie není dostupná
              </div>
            )}
          </Link>
          {badgeLabel && (
            <ProductCard.Badges className="absolute top-0 left-0">
              <Badge size="sm" variant="primary">
                {badgeLabel}
              </Badge>
            </ProductCard.Badges>
          )}
        </div>
        <ProductCard.Name className="m-0 text-center uppercase" title={name}>
          <Link href={detailHref} onClick={previewDetail}>
            {name}
          </Link>
        </ProductCard.Name>
        <AvailabilityStatus {...availability} data-akros-card-availability />
        <p
          className="m-0 line-clamp-2 text-fg-primary text-sm"
          title={description}
        >
          {description}
        </p>
        <PriceBlock
          {...price}
          className="mt-auto items-center text-center"
          data-akros-card-price
        />
        <ProductCard.Actions
          aria-busy={pending || undefined}
          className="mt-auto block"
        >
          {actionContent}
          {detailAction ? (
            <LinkButton
              block
              href={detailHref}
              onClick={previewDetail}
              size="sm"
              uppercase
              variant="primary"
            >
              {action === "variants" ? "Vybrat variantu" : "Zobrazit detail"}
            </LinkButton>
          ) : (
            <Button
              aria-label={
                pending ? `Přidávám do košíku: ${name}` : `Do košíku: ${name}`
              }
              block
              disabled={action === "disabled"}
              icon="token-icon-cart-button"
              isLoading={pending}
              loadingText="Přidávám…"
              onClick={() => onAddToCart()}
              size="sm"
              type="button"
              uppercase
            >
              Do košíku
            </Button>
          )}
        </ProductCard.Actions>
        {pending && (
          <output className="sr-only">Přidávám produkt do košíku.</output>
        )}
      </ProductCard>
      <Dialog
        customTrigger
        open={detailOpen}
        onOpenChange={({ open }) => setDetailOpen(open)}
        title={name}
        description={description}
      >
        <PriceBlock {...price} />
        <AvailabilityStatus {...availability} />
        <StatusText>
          Lokální náhled produktu. Storybook zůstává otevřený.
        </StatusText>
      </Dialog>
    </article>
  )
}

const meta = {
  title: "Templates/AkrosProductCardComposition",
  component: AkrosCardExample,
  decorators: [
    (Story) => (
      <div className="flex flex-col gap-200">
        <StatusText size="sm">Akros · světlý režim · lokální ukázka</StatusText>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],

  parameters: {
    brandLock: "akros",
    layout: "padded",
    docs: {
      description: {
        component:
          "Akros produktová karta skládá ProductCard, PriceBlock a AvailabilityStatus pro srovnatelný katalog. Použijte ji pro prodej balení se skladovostí a připravenou cenou; pro běžnou univerzální kartu použijte ProductCardTemplate a pro košík LineItem. Aplikace vlastní cenu, dostupnost i validaci množství. Odkazy otevírají místní náhled a nikdy neopustí Storybook. Akros je záměrně pouze světlý.",
      },
    },
  },
  argTypes: {
    name: { control: "text" },
    description: { control: "text" },
    price: {
      control: "object",
      description: "PriceBlockProps — stav a připravené popisky.",
    },
    availability: {
      control: "object",
      description: "AvailabilityStatusProps — stav a připravené popisky.",
    },
    badgeLabel: { control: "text" },
    imageAvailable: { control: "boolean" },
    action: {
      control: "select",
      options: ["add", "pending", "disabled", "detail", "variants"],
    },
    onAddToCart: { control: false },
    actionContent: { control: false, table: { disable: true } },
  },
  args: {
    name: "Montážní sada M8",
    description: "100 ks · pozink · kód MS-008",
    price: {
      state: "known",
      amountLabel: "249 Kč",
      taxLabel: "vč. DPH",
      unitLabel: "za balení",
    },
    availability: { status: "available", label: "Skladem" },
    imageAvailable: true,
    action: "add",
    onAddToCart: fn(),
  },
} satisfies Meta<typeof AkrosCardExample>

export default meta
type Story = StoryObj<AkrosCardExampleProps>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole("link", { name: /Detail produktu/ })
    const before = window.location.href
    await userEvent.click(link)
    await expect(
      within(canvasElement.ownerDocument.body).getByRole("dialog"),
    ).toBeVisible()
    await expect(window.location.href).toBe(before)
    await userEvent.keyboard("{Escape}")
  },

  parameters: {
    docs: {
      description: {
        story:
          "Upravte cenu, dostupnost a nákupní akci montážní sady; odkaz otevře místní detail a přidání pouze potvrdí výsledek v ukázce.",
      },
    },
  },

  render: (args) => (
    <div className="w-full max-w-2xs">
      <AkrosCardExample {...args} />
    </div>
  ),
}

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Karty rozlišují běžný nákup, probíhající přidání, nedostupnou akci a výběr variant, aby další krok odpovídal stavu produktu.",
      },
    },
    controls: { disable: true },
  },
  render: (args) => (
    <VariantContainer>
      <VariantGroup fullWidth title="Akce a dostupnost">
        <div data-akros-card-grid>
          <AkrosCardExample {...args} />
          <AkrosCardExample
            {...args}
            action="pending"
            name="Probíhající přidání"
          />
          <AkrosCardExample
            {...args}
            action="disabled"
            name="Nedostupný produkt"
            availability={{ status: "unavailable", label: "Není skladem" }}
          />
          <AkrosCardExample
            {...args}
            action="variants"
            name="Produkt s variantami"
            price={{
              state: "from",
              prefix: "Od",
              amountLabel: "249 Kč",
              unitLabel: "za balení",
            }}
          />
        </div>
      </VariantGroup>
      <VariantGroup fullWidth title="Cena a obrázek">
        <div data-akros-card-grid>
          <AkrosCardExample
            {...args}
            badgeLabel="Akce"
            price={{
              state: "discounted",
              amountLabel: "249 Kč",
              originalLabel: "311,25 Kč",
              originalSrLabel: "Původní cena",
              discountLabel: "−20 %",
              unitLabel: "za balení",
            }}
          />
          <AkrosCardExample
            {...args}
            action="detail"
            name="Cena na dotaz"
            price={{ state: "on-request", label: "Cena na dotaz" }}
          />
          <AkrosCardExample
            {...args}
            imageAvailable={false}
            name="Produkt bez fotografie"
          />
          <AkrosCardExample
            {...args}
            name="Poslední balení"
            availability={{ status: "limited", label: "Poslední balení" }}
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

const priceExamples = [
  {
    name: "Známá cena",
    action: "add",
    price: {
      state: "known",
      amountLabel: "249 Kč",
      taxLabel: "vč. DPH",
      unitLabel: "za balení",
    },
  },
  {
    name: "Cena od",
    action: "variants",
    price: {
      state: "from",
      prefix: "Od",
      amountLabel: "249 Kč",
      unitLabel: "za balení",
    },
  },
  {
    name: "Zlevněné balení",
    action: "add",
    price: {
      state: "discounted",
      amountLabel: "249 Kč",
      originalLabel: "311,25 Kč",
      originalSrLabel: "Původní cena",
      discountLabel: "−20 %",
      taxLabel: "vč. DPH",
      unitLabel: "za balení",
    },
  },
  {
    name: "Cena na dotaz",
    action: "detail",
    price: {
      state: "on-request",
      label: "Cena na dotaz",
      detail: "Cenu upřesní obchodní zástupce.",
    },
  },
  {
    name: "Cena se načítá",
    action: "disabled",
    price: { state: "pending", pendingLabel: "Načítání ceny produktu" },
  },
] satisfies Pick<AkrosCardExampleProps, "name" | "action" | "price">[]

export const PriceStates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Známá cena, cena od, sleva, cena na dotaz a načítání ukazují všechny větve PriceBlock bez vymyšlené nulové ceny.",
      },
    },
    controls: { disable: true },
  },
  render: (args) => (
    <VariantContainer>
      <VariantGroup fullWidth title="PriceBlock z PR06 v produktové kartě">
        <div data-akros-card-grid>
          {priceExamples.map((example) => (
            <AkrosCardExample
              {...args}
              {...example}
              key={example.price.state}
            />
          ))}
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

const availabilityExamples = [
  {
    name: "Dostupný produkt",
    action: "add",
    availability: {
      status: "available",
      label: "Skladem",
      detail: "Připraveno k expedici.",
    },
  },
  {
    name: "Omezená dostupnost",
    action: "add",
    availability: {
      status: "limited",
      label: "Poslední balení",
      detail: "Do vyprodání zásob.",
    },
  },
  {
    name: "Produkt na objednávku",
    action: "detail",
    availability: {
      status: "preorder",
      label: "Na objednávku",
      detail: "Termín upřesníme při objednání.",
    },
  },
  {
    name: "Nedostupný produkt",
    action: "disabled",
    availability: { status: "unavailable", label: "Není skladem" },
  },
  {
    name: "Neznámá dostupnost",
    action: "detail",
    availability: {
      status: "unknown",
      label: "Dostupnost neznámá",
      detail: "Informujte se u prodejce.",
    },
  },
  {
    name: "Dostupnost se načítá",
    action: "disabled",
    availability: {
      status: "pending",
      pendingLabel: "Načítání dostupnosti produktu",
    },
  },
] satisfies Pick<AkrosCardExampleProps, "name" | "action" | "availability">[]

export const AvailabilityStates: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Dostupnost používá konkrétní skladové popisky a doplňující informace, takže stav produktu není sdělen pouze barvou.",
      },
    },
    controls: { disable: true },
  },
  render: (args) => (
    <VariantContainer>
      <VariantGroup
        fullWidth
        title="AvailabilityStatus z PR06 v produktové kartě"
      >
        <div data-akros-card-grid>
          {availabilityExamples.map((example) => (
            <AkrosCardExample
              {...args}
              {...example}
              key={example.availability.status}
            />
          ))}
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const LongContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Dlouhý název, popis a informace o dostupnosti se zalamují uvnitř karty, aby zůstaly čitelné i v úzkém katalogu.",
      },
    },
  },

  args: {
    name: "Nerezová montážní sada M8 s podložkami a pojistnými maticemi pro venkovní konstrukce",
    description:
      "Balení obsahuje 100 kompletních sad pro montáž ve venkovním prostředí · kód MS-008-NEREZ",
    price: {
      state: "discounted",
      amountLabel: "12 345,67 Kč",
      originalLabel: "15 432,10 Kč",
      originalSrLabel: "Původní cena",
      discountLabel: "−20 %",
      taxLabel: "včetně daně z přidané hodnoty",
      unitLabel: "za velkoobchodní balení po 100 kusech",
    },
    availability: {
      status: "available",
      label: "Skladem v centrálním distribučním skladu",
      detail: "Doručení upřesníme podle zvoleného způsobu dopravy.",
    },
    imageAvailable: false,
  },
  render: Playground.render,
}

export const ResponsiveCatalog: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Responzivní katalog zachovává srovnatelné ceny, skladovost a nákupní akce při přechodu z více sloupců na mobilní zobrazení.",
      },
    },
    controls: { disable: true },
  },
  render: (args) => (
    <div data-akros-card-grid>
      <AkrosCardExample {...args} badgeLabel="Doporučujeme" />
      <AkrosCardExample
        {...args}
        action="variants"
        name="Nerezové spojovací prvky pro venkovní konstrukce"
        price={{
          state: "from",
          prefix: "Od",
          amountLabel: "249 Kč",
          unitLabel: "za balení",
        }}
      />
      <AkrosCardExample
        {...args}
        imageAvailable={false}
        name="Sada bez fotografie"
      />
      <AkrosCardExample
        {...args}
        action="disabled"
        name="Momentálně nedostupná sada"
        availability={{ status: "unavailable", label: "Není skladem" }}
      />
    </div>
  ),
}

function QuantityCardExample(args: AkrosCardExampleProps) {
  const [quantity, setQuantity] = useState("2")
  const [addedQuantity, setAddedQuantity] = useState<string>()
  // Representative consumer validation, not a rule owned by ProductCard.
  const parsed = Number(quantity)
  const valid =
    quantity.trim() !== "" &&
    Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= 10

  return (
    <div className="flex w-full max-w-2xs flex-col gap-200">
      <p className="m-0 text-fg-primary text-sm">
        Volitelný výběr množství. Změňte počet balení a klikněte na Do košíku.
        Prázdné pole nebo hodnota mimo 1–10 blokuje přidání; rozepsaná hodnota
        zůstává v poli.
      </p>
      <AkrosCardExample
        {...args}
        action={valid ? "add" : "disabled"}
        actionContent={
          <div className="mb-200">
            <QuantityField
              label="Množství"
              unitLabel="balení"
              value={quantity}
              onValueChange={({ value }) => setQuantity(value)}
              min={1}
              max={10}
              step={1}
              size="sm"
              helperText="Zvolte 1–10 celých balení."
              error={valid ? undefined : "Zadejte celé množství od 1 do 10."}
            />
          </div>
        }
        onAddToCart={() => {
          args.onAddToCart(quantity)
          setAddedQuantity(quantity)
        }}
      />
      {addedQuantity !== undefined && (
        <StatusText role="status">
          Ukázková akce: přidat {addedQuantity} balení.
        </StatusText>
      )}
    </div>
  )
}

export const WithQuantityField: Story = {
  name: "With Quantity Field",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Volitelný QuantityField v existujícím ProductCard.Actions slotu. Karta ani PriceBlock nepřepočítávají cenu; hodnota zůstává string draft a aplikace vlastní validaci i akci přidání. Story pouze ukáže předané množství, neprovádí síťový požadavek.",
      },
    },
  },
  render: (args) => <QuantityCardExample {...args} />,
}
