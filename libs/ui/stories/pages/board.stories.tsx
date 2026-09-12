import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Menu, type MenuItem } from "../../src/molecules/menu"
import { Tooltip } from "../../src/atoms/tooltip"
import { Toaster, useToast } from "../../src/molecules/toast"
import { SelectTemplate } from "../../src/templates/select"
import { adminNav, type BoardCard, boardColumns } from "./data"
import { Brand, Frame, GlobalSearch, NavList, Panel, TopBar } from "./frame"
import { EmptyState, PageHeader } from "./shell"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  title: "Pages/Patterns/Board",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Column-per-state work tracking. A board is the right shape when *state* is the",
          "primary thing a user changes and the number of items per state is small enough",
          "to see at once; past a few dozen items per column, a filtered table wins.",
          "",
          "**Pattern rules**",
          "- Columns are states, never people or dates — those are filters.",
          "- Every card shows the same three facts in the same order: what, context, who.",
          "  Cards that differ in shape cannot be compared at a glance.",
          "- Each column states its own count, and a WIP limit is shown where one exists,",
          "  because the point of the board is noticing a column filling up.",
          "- Cards move by an explicit action (a `Menu`), not only by dragging: drag is a",
          "  shortcut, never the only route.",
          "- An empty column keeps its header and shows why it is empty.",
          "",
          "The board scrolls horizontally as one region; the page itself never does.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const priorityVariant = {
  high: "danger",
  normal: "outline",
  low: "secondary",
} as const

const groupItems = [
  { label: "Group by status", value: "status" },
  { label: "Group by owner", value: "owner" },
  { label: "Group by priority", value: "priority" },
]

function cardMenu(columns: typeof boardColumns, currentId: string): MenuItem[] {
  return columns
    .filter((column) => column.id !== currentId)
    .map((column) => ({
      type: "action" as const,
      value: column.id,
      label: `Move to ${column.title}`,
      icon: "icon-[mdi--arrow-right-bold-box-outline]" as const,
    }))
}

function BoardPage({ emptyColumn }: { emptyColumn?: boolean }) {
  const toaster = useToast()
  const [nav, setNav] = useState("sales-returns")
  const [columns, setColumns] = useState(
    emptyColumn
      ? boardColumns.map((column) =>
          column.id === "review" ? { ...column, cards: [] } : column
        )
      : boardColumns
  )

  const move = (card: BoardCard, from: string, to: string) => {
    setColumns((current) =>
      current.map((column) => {
        if (column.id === from) {
          return {
            ...column,
            cards: column.cards.filter((entry) => entry.id !== card.id),
          }
        }
        if (column.id === to) {
          return { ...column, cards: [card, ...column.cards] }
        }
        return column
      })
    )
    toaster.create({
      type: "success",
      title: "Moved",
      description: `${card.title} → ${
        columns.find((column) => column.id === to)?.title ?? to
      }`,
    })
  }

  return (
    <Frame
      left={
        <Panel label="Main navigation" side="start">
          <Brand />
          <NavList
            defaultExpanded={["sales"]}
            nav={adminNav}
            onSelect={setNav}
            selected={nav}
          />
        </Panel>
      }
      top={<TopBar center={<GlobalSearch placeholder="Search tickets…" />} />}
    >
      <Toaster />

      <PageHeader
        actions={
          <>
            <div className="w-2xs">
              <SelectTemplate defaultValue={["status"]} items={groupItems} size="sm" />
            </div>
            <Button icon="icon-[mdi--plus]" size="sm" variant="primary">
              New ticket
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Sales", href: "#" },
          { label: "Operations board" },
        ]}
        description="Everything support and operations are holding right now, by state."
        title="Operations board"
      />

      <div className="flex min-h-0 flex-1 gap-200 overflow-x-auto pb-200">
        {columns.map((column) => (
          <section
            aria-label={column.title}
            className="flex w-2xs shrink-0 flex-col gap-150 rounded-lg border border-border-primary bg-surface p-150"
            key={column.id}
          >
            <header className="flex items-center justify-between gap-100">
              <h2 className="flex items-center gap-100 font-semibold text-sm">
                {column.title}
                <Badge size="sm" variant="outline">
                  {String(column.cards.length)}
                </Badge>
              </h2>
              {column.id === "progress" && (
                <Tooltip content="Work-in-progress limit for this column">
                  <span className="text-fg-secondary text-xs">WIP 3</span>
                </Tooltip>
              )}
            </header>

            {column.cards.length === 0 ? (
              <EmptyState
                description="Nothing is waiting for review."
                icon="icon-[mdi--check-circle-outline]"
                title="Clear"
              />
            ) : (
              <div className="flex flex-col gap-150">
                {column.cards.map((card) => (
                  <article
                    className="flex flex-col gap-100 rounded-md border border-border-primary bg-base p-150"
                    key={card.id}
                  >
                    <div className="flex items-start justify-between gap-100">
                      <h3 className="font-medium text-sm">{card.title}</h3>
                      <Menu
                        aria-label={`Actions for ${card.title}`}
                        customTrigger={
                          <Button
                            aria-label={`Actions for ${card.title}`}
                            icon="icon-[mdi--dots-horizontal]"
                            size="sm"
                            theme="borderless"
                            variant="secondary"
                          />
                        }
                        items={cardMenu(columns, column.id)}
                        onSelect={({ value }) => move(card, column.id, value)}
                      />
                    </div>
                    <p className="text-fg-secondary text-xs">{card.meta}</p>
                    <div className="flex flex-wrap items-center gap-100">
                      <Badge size="sm" variant={priorityVariant[card.priority]}>
                        {card.priority}
                      </Badge>
                      <span className="flex items-center gap-50 text-fg-secondary text-xs">
                        <Icon icon="icon-[mdi--account-outline]" size="sm" />
                        {card.owner}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <Button
              block
              icon="icon-[mdi--plus]"
              size="sm"
              theme="borderless"
              variant="secondary"
            >
              Add
            </Button>
          </section>
        ))}
      </div>
    </Frame>
  )
}

export const Default: Story = {
  name: "Columns by state",
  render: () => <BoardPage />,
}

export const WithEmptyColumn: Story = {
  name: "Empty column",
  parameters: {
    docs: {
      description: {
        story:
          "An empty column keeps its header, its count and its add action. Collapsing it would hide the very fact the board exists to show.",
      },
    },
  },
  render: () => <BoardPage emptyColumn />,
}
