import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentProps, useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { StatusText } from "../../src/atoms/status-text"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import {
  TotalsSummary,
  type TotalsSummaryRow,
} from "../../src/molecules/totals-summary"

function SummaryWithPreview(props: ComponentProps<typeof TotalsSummary>) {
  const [reviewing, setReviewing] = useState(false)
  return (
    <div className="flex flex-col gap-200">
      <TotalsSummary
        {...props}
        actions={
          <Button
            disabled={props.pending}
            onClick={() => setReviewing(!reviewing)}
          >
            {reviewing ? "Zpět k souhrnu" : "Zobrazit rekapitulaci"}
          </Button>
        }
      />
      {reviewing && (
        <section
          aria-label="Rekapitulace objednávky"
          className="rounded-md border border-border-primary p-200"
        >
          <StatusText role="status">
            Rekapitulace: {props.totalValue}. Doručení na adresu, platba kartou.
            Toto demo objednávku neodesílá.
          </StatusText>
        </section>
      )}
    </div>
  )
}
const completeRows: readonly TotalsSummaryRow[] = [
  { id: "goods", label: "Zboží", value: "1 498 Kč" },
  {
    id: "shipping",
    label: "Doprava",
    value: "89 Kč",
    note: "Doručení na adresu",
  },
  { id: "payment", label: "Platba", value: "Zdarma", note: "Kartou online" },
]
const partialRows: readonly TotalsSummaryRow[] = [
  { id: "goods", label: "Zboží", value: "1 498 Kč" },
  { id: "shipping", label: "Doprava", value: "Zvolte dopravu" },
  { id: "payment", label: "Platba", value: "Zvolte platbu" },
]

const meta: Meta<typeof TotalsSummary> = {
  title: "Molecules/TotalsSummary",
  component: TotalsSummary,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Rozpis připravených částek pro košík, objednávku a rekapitulaci. Aplikace určuje řádky i výsledný součet; nevybraná doprava není nula. Pending zachová poslední částky a zablokuje akce. Pro jednu produktovou cenu použijte PriceBlock. Souhrn je obsahová kompozice, nikoli formulářové pole, a nemá osu velikostí sm/md/lg.",
      },
    },
  },
  args: {
    rows: completeRows,
    totalLabel: "Celkem včetně DPH",
    totalValue: "1 587 Kč",
    pendingLabel: "Aktualizujeme souhrn objednávky",
    footer: "Částky jsou uvedeny včetně DPH.",
  },
  argTypes: {
    rows: { control: "object" },
    totalLabel: { control: "text" },
    totalValue: { control: "text" },
    pending: { control: "boolean" },
    pendingLabel: { control: "text" },
    footer: { control: "text" },
    actions: { control: false },
    ref: { control: false },
  },
}
export default meta
type Story = StoryObj<typeof TotalsSummary>

export const Playground: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const action = canvas.getByRole("button", { name: "Zobrazit rekapitulaci" })
    if (args.pending) {
      await expect(action).toBeDisabled()
      return
    }
    await userEvent.click(action)
    await expect(
      canvas.getByRole("region", { name: "Rekapitulace objednávky" })
    ).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Zpět k souhrnu" })
    )
    await expect(
      canvas.queryByRole("region", { name: "Rekapitulace objednávky" })
    ).not.toBeInTheDocument()
  },
  parameters: {
    docs: {
      description: {
        story:
          "Adjust the controls to explore totals summary using realistic content and immediately visible results.",
      },
    },
  },

  render: (args) => (
    <div className="w-full max-w-md">
      <SummaryWithPreview {...args} />
    </div>
  ),
}

export const Partial: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare partial in totals summary to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Částečný souhrn — doprava ještě není vybraná",
  args: {
    rows: partialRows,
    totalLabel: "Mezisoučet včetně DPH",
    totalValue: "1 498 Kč",
    footer: "Konečná cena bude dostupná po výběru dopravy a platby.",
  },
  render: (args) => (
    <div className="w-full max-w-md">
      <TotalsSummary {...args} />
    </div>
  ),
}

export const Complete: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare complete in totals summary to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Kompletní souhrn — vybraná doprava a platba",
  render: (args) => (
    <div className="w-full max-w-md">
      <SummaryWithPreview {...args} />
    </div>
  ),
}

export const Discounted: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare discounted in totals summary to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Sleva — samostatný záporný řádek",
  args: {
    rows: [
      ...completeRows,
      {
        id: "discount",
        label: "Sleva VITEJTE",
        value: "−150 Kč",
        emphasis: "discount",
        note: "Platný slevový kód",
      },
    ],
    totalValue: "1 437 Kč",
  },
  render: (args) => (
    <div className="w-full max-w-md">
      <TotalsSummary {...args} />
    </div>
  ),
}

export const Pending: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare pending in totals summary to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Aktualizace — poslední částky a zablokovaná akce",
  args: { pending: true, pendingLabel: "Aktualizujeme souhrn objednávky" },
  render: (args) => (
    <div className="w-full max-w-md">
      <SummaryWithPreview {...args} />
    </div>
  ),
}

export const CustomRows: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare custom rows in totals summary to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Vlastní řádky — bez předepsaných poplatků a výpočtů",
  render: () => (
    <VariantContainer>
      <VariantGroup title="Souhrn s vlastními řádky" fullWidth>
        <div className="w-full max-w-md">
          <TotalsSummary
            rows={[
              { id: "net", label: "Základ daně", value: "1 000 Kč" },
              { id: "tax", label: "DPH 21 %", value: "210 Kč" },
              {
                id: "deposit",
                label: "Vratná záloha za obal",
                value: "100 Kč",
                note: "Vracíme po odevzdání obalu",
              },
            ]}
            totalLabel="Celkem včetně zálohy"
            totalValue="1 310 Kč"
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
