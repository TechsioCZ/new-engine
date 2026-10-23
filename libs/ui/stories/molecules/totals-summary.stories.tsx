import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentProps, useLayoutEffect, useRef, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
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
          "Edit application-prepared rows and totals, then open the local recap; this presentation component does not calculate prices or submit an order.",
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
          "Keep unselected shipping and payment explicit and label the amount as a subtotal rather than implying these unresolved fees are free.",
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
          "Show the final tax-inclusive total with selected shipping and payment, then open a local-only recap.",
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
          "Present a valid promotion as its own negative row so shoppers can distinguish the reduction from fees and the final total.",
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
          "Retain last-known amounts while an update is pending and block checkout; completion and announcements belong to the application.",
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
          "Supply tax and refundable-deposit rows without a prescribed fee schema; the application prepares every displayed amount.",
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

function PendingFocusExample() {
  const [pending, setPending] = useState(false)
  const [outcome, setOutcome] = useState(
    "Ready to update. This demo sends no requests."
  )
  const [removed, setRemoved] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const initiator = useRef<HTMLButtonElement | null>(null)
  const shouldRestore = useRef(false)
  const complete = (failed: boolean) => {
    // Completion may arrive after the user has moved elsewhere: do not steal focus.
    shouldRestore.current = document.activeElement === statusRef.current
    setOutcome(
      failed ? "Update failed. Retry the update." : "Summary updated locally."
    )
    setPending(false)
  }
  useLayoutEffect(() => {
    const target = initiator.current
    if (
      !pending &&
      shouldRestore.current &&
      target?.isConnected &&
      !target.disabled &&
      document.activeElement === statusRef.current
    )
      target.focus()
    shouldRestore.current = false
  }, [pending])
  return (
    <div className="flex w-full max-w-md flex-col gap-200">
      <div
        ref={statusRef}
        tabIndex={-1}
        className="rounded-md border border-border-primary p-200 focus-visible:outline"
      >
        <StatusText role="status">
          {pending ? "Updating the summary locally…" : outcome}
        </StatusText>
      </div>
      <TotalsSummary
        rows={completeRows}
        totalLabel="Total including tax"
        totalValue="1 587 Kč"
        {...(pending
          ? { pending: true, pendingLabel: "Updating summary" }
          : { pending: false })}
        actions={
          !removed && (
            <Button
              onClick={(event) => {
                initiator.current = event.currentTarget
                statusRef.current?.focus()
                setPending(true)
              }}
            >
              {outcome.startsWith("Update failed")
                ? "Retry update"
                : "Update summary"}
            </Button>
          )
        }
      />
      <div className="flex flex-wrap gap-200">
        <Button
          variant="secondary"
          onClick={() => {
            if (pending) complete(false)
            else setOutcome("Start an update before simulating its completion.")
          }}
        >
          Simulate success
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (pending) complete(true)
            else setOutcome("Start an update before simulating a failure.")
          }}
        >
          Simulate failure
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (!pending) {
              setOutcome(
                "Start an update before removing its initiating action."
              )
              return
            }
            setRemoved(true)
            setOutcome(
              "Action removed. Focus stays at the current stable destination."
            )
            setPending(false)
          }}
        >
          Remove initiating action
        </Button>
      </div>
      <Button
        variant="secondary"
        onClick={() =>
          setOutcome(
            "You moved to another action; completion must not move focus back."
          )
        }
      >
        Another action
      </Button>
    </div>
  )
}

export const PendingFocusLifecycle: Story = {
  render: () => <PendingFocusExample />,
  parameters: {
    docs: {
      description: {
        story:
          "Start a simulated update to hand focus to a stable status before actions become inert; completion restores only a surviving initiator when the user has not moved elsewhere.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const start = canvas.getByRole("button", { name: "Update summary" })
    await userEvent.click(start)
    const status = canvas
      .getByText("Updating the summary locally…")
      .closest("[tabindex]")
    await expect(status).toHaveFocus()
    // Emulate asynchronous completion without moving the user's focus onto the simulation controls.
    canvas.getByRole("button", { name: "Simulate failure" }).click()
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Retry update" })).toHaveFocus()
    )
    await userEvent.keyboard("{Enter}")
    await expect(status).toHaveFocus()
    canvas.getByRole("button", { name: "Simulate success" }).click()
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Update summary" })
      ).toHaveFocus()
    )
    await userEvent.keyboard("{Enter}")
    await userEvent.click(
      canvas.getByRole("button", { name: "Another action" })
    )
    canvas.getByRole("button", { name: "Simulate success" }).click()
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Another action" })
      ).toHaveFocus()
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Update summary" })
    )
    canvas.getByRole("button", { name: "Remove initiating action" }).click()
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: "Update summary" })
      ).not.toBeInTheDocument()
    )
    await expect(status).toHaveFocus()
  },
}
