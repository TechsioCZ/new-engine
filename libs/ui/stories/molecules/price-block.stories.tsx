import { expect, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  PriceBlock,
  type PriceBlockProps,
} from "../../src/molecules/price-block"

const meta: Meta<typeof PriceBlock> = {
  title: "Molecules/PriceBlock",
  component: PriceBlock,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "PriceBlock presents application-formatted prices, discounts, tax and unit context. Use it in product cards and buy boxes; use TotalsSummary for order totals and a normal text label for non-commerce amounts. It is display-only, so disabled and read-only are not price states.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = Omit<StoryObj<typeof meta>, "args"> & {
  args?: Partial<PriceBlockProps>
}
type PlaygroundArgs = {
  state: PriceBlockProps["state"]
  amountLabel: string
  originalLabel: string
  originalSrLabel: string
  taxLabel: string
  unitLabel: string
  discountLabel: string
  prefix: string
  label: string
  detail: string
  pendingLabel: string
}

export const Playground: StoryObj<PlaygroundArgs> = {
  parameters: {
    docs: {
      description: {
        story: "Switch between all five price states and edit the labels to verify the exact price, on-request or loading presentation your shoppers will receive.",
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    if (args.state === "pending")
      await expect(canvas.getByText(args.pendingLabel)).toBeInTheDocument()
    else if (args.state === "on-request")
      await expect(canvas.getByText(args.label)).toBeVisible()
    else
      await expect(
        canvas.getByText(args.amountLabel, { exact: true }),
      ).toBeVisible()
  },

  args: {
    state: "discounted",
    amountLabel: "249 Kč",
    originalLabel: "299 Kč",
    originalSrLabel: "Původní cena",
    taxLabel: "vč. DPH",
    unitLabel: "za balení",
    discountLabel: "Akce",
    prefix: "Od",
    label: "Cena na dotaz",
    detail: "Kontaktujte nás pro cenovou nabídku.",
    pendingLabel: "Načítání ceny",
  },
  argTypes: {
    state: {
      control: "select",
      options: ["known", "from", "discounted", "on-request", "pending"],
    },
    amountLabel: { control: "text" },
    originalLabel: { control: "text", if: { arg: "state", eq: "discounted" } },
    originalSrLabel: {
      control: "text",
      if: { arg: "state", eq: "discounted" },
    },
    discountLabel: { control: "text", if: { arg: "state", eq: "discounted" } },
    prefix: { control: "text", if: { arg: "state", eq: "from" } },
    label: { control: "text", if: { arg: "state", eq: "on-request" } },
    detail: { control: "text", if: { arg: "state", eq: "on-request" } },
    pendingLabel: { control: "text", if: { arg: "state", eq: "pending" } },
  },
  render: (args) => {
    if (args.state === "pending")
      return <PriceBlock state="pending" pendingLabel={args.pendingLabel} />
    if (args.state === "on-request")
      return (
        <PriceBlock
          state="on-request"
          label={args.label}
          detail={args.detail}
        />
      )
    const common = {
      amountLabel: args.amountLabel,
      taxLabel: args.taxLabel,
      unitLabel: args.unitLabel,
    }
    if (args.state === "from")
      return <PriceBlock {...common} state="from" prefix={args.prefix} />
    if (args.state === "discounted")
      return (
        <PriceBlock
          {...common}
          state="discounted"
          originalLabel={args.originalLabel}
          originalSrLabel={args.originalSrLabel}
          discountLabel={args.discountLabel}
        />
      )
    return <PriceBlock {...common} state="known" />
  },
}

export const States: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare states in price block to choose a suitable presentation for real product content.",
      },
    },
  },

  render: () => (
    <VariantContainer>
      <VariantGroup title="Price states" fullWidth>
        <PriceBlock
          state="known"
          amountLabel="249 Kč"
          taxLabel="205,79 Kč bez DPH"
          unitLabel="za balení"
        />
        <PriceBlock
          state="from"
          prefix="Od"
          amountLabel="149 Kč"
          unitLabel="za kus"
        />
        <PriceBlock
          state="discounted"
          amountLabel="249 Kč"
          originalLabel="299 Kč"
          originalSrLabel="Původní cena"
          taxLabel="vč. DPH"
          unitLabel="za balení"
          discountLabel="Akce"
        />
        <PriceBlock
          state="on-request"
          label="Cena na dotaz"
          detail="Cenu nyní nelze zobrazit."
        />
        <PriceBlock state="pending" pendingLabel="Načítání ceny" />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const LongContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare long content in price block to choose a suitable presentation for real product content.",
      },
    },
  },

  render: () => (
    <VariantContainer>
      <VariantGroup title="Narrow layout" fullWidth>
        <div className="w-3xs">
          <PriceBlock
            state="from"
            prefix="Cena za jednu samostatně prodejnou jednotku od"
            amountLabel="12 345 678,90 Kč"
            taxLabel="10 203 040,41 Kč bez DPH"
            unitLabel="za velkoobchodní balení po dvaceti čtyřech kusech"
          />
        </div>
        <div className="w-3xs">
          <PriceBlock
            state="discounted"
            amountLabel="12 345 678,90 Kč"
            originalLabel="14 999 999,90 Kč"
            originalSrLabel="Původní cena"
            taxLabel="včetně daně z přidané hodnoty"
            unitLabel="za velkoobchodní balení"
            discountLabel="Mimořádná akční nabídka"
          />
        </div>
        <div className="w-3xs">
          <PriceBlock
            state="on-request"
            label="Cena je dostupná na vyžádání u obchodního zástupce"
            detail="Konečná cena závisí na objednaném množství a zvoleném způsobu dopravy."
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
