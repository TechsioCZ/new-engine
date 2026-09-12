import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Accordion } from "../../src/molecules/accordion"
import { Dialog } from "../../src/molecules/dialog"
import { Menu, type MenuItem } from "../../src/molecules/menu"
import { Tabs } from "../../src/molecules/tabs"
import type { ColumnDef } from "../../src/organisms/data-table"
import { DataTable } from "../../src/organisms/data-table"
import {
  adminNav,
  type ContentEntry,
  contentEntries,
  contentStatusOptions,
  currency,
  orders,
  sectionOptions,
} from "./data"
import {
  Brand,
  Frame,
  GlobalSearch,
  IconRail,
  NavDrawer,
  NavList,
  Panel,
  type RailItem,
  TopBar,
  TopNav,
} from "./frame"
import {
  DetailList,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatRow,
  StatusBadge,
} from "./shell"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Layouts/Shell arrangements",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Every shell arrangement the kit supports, built from the same four slots —",
          "top bar, leading panel, content, trailing panel — so a product can change its",
          "chrome without rewriting its pages.",
          "",
          "**How to choose**",
          "| Arrangement | Use when |",
          "| --- | --- |",
          "| Sidebar left | 5+ destinations, deep hierarchy — the admin default |",
          "| Sidebar right | Navigation is shallow, but every screen needs context (help, activity, AI assist) |",
          "| Dual sidebar | Deep navigation *and* a persistent inspector — desktop-only tools |",
          "| Icon rail | Few destinations the user already knows; content needs the width |",
          "| Top navigation | Marketing-adjacent or ≤6 destinations; matches the storefront |",
          "| Top nav + sub-nav | Two navigation levels without nesting a tree |",
          "| Three pane | Queue work: pick from a list, act in the reading pane |",
          "| Full-bleed workspace | The grid *is* the page — spreadsheets, logs, monitors |",
          "| Centered column | Reading and long forms; measure beats width |",
          "| Focused task | Wizards and checkouts — chrome would only offer ways to fail |",
          "",
          "Rules that hold across all of them: one `<main>`, panels are `<aside>` with a",
          "label, only the content column scrolls, side panels drop below `lg` instead of",
          "squeezing the content, and the leading panel is always the primary navigation.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const railItems: RailItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "icon-[mdi--view-dashboard-outline]" },
  { id: "catalog-products", label: "Products", icon: "icon-[mdi--package-variant-closed]" },
  { id: "sales-orders", label: "Orders", icon: "icon-[mdi--receipt-text-outline]" },
  { id: "customers", label: "Customers", icon: "icon-[mdi--account-group-outline]" },
  { id: "content-pages", label: "Content", icon: "icon-[mdi--text-box-outline]" },
  { id: "settings-team", label: "Settings", icon: "icon-[mdi--cog-outline]" },
]

const topNavItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "catalog-products", label: "Catalog" },
  { id: "sales-orders", label: "Orders" },
  { id: "customers", label: "Customers" },
  { id: "content-pages", label: "Content" },
]

/* One sub-navigation set per top-level section. */
type SubNavEntry = { value: string; label: string }

const DASHBOARD_SUBNAV: SubNavEntry[] = [
  { value: "overview", label: "Overview" },
  { value: "alerts", label: "Alerts" },
]

const subNav: Record<string, SubNavEntry[]> = {
  dashboard: DASHBOARD_SUBNAV,
  "catalog-products": [
    { value: "products", label: "Products" },
    { value: "categories", label: "Categories" },
    { value: "brands", label: "Brands" },
  ],
  "sales-orders": [
    { value: "orders", label: "Orders" },
    { value: "returns", label: "Returns" },
    { value: "discounts", label: "Discounts" },
  ],
  customers: [
    { value: "accounts", label: "Accounts" },
    { value: "segments", label: "Segments" },
  ],
  "content-pages": [
    { value: "pages", label: "Pages" },
    { value: "articles", label: "Articles" },
    { value: "media", label: "Media" },
    { value: "redirects", label: "Redirects" },
  ],
}

const accountMenu: MenuItem[] = [
  { type: "action", value: "profile", label: "Profile", icon: "icon-[mdi--account-outline]" },
  { type: "action", value: "preferences", label: "Preferences", icon: "icon-[mdi--tune]" },
  { type: "separator", id: "account" },
  { type: "action", value: "sign-out", label: "Sign out", icon: "icon-[mdi--logout]" },
]

function useContentColumns(): ColumnDef<ContentEntry, unknown>[] {
  return useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        meta: { type: "string", width: 240 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.slug}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "section",
        header: "Section",
        meta: { type: "enum", options: sectionOptions, width: 150 },
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { type: "enum", options: contentStatusOptions, width: 130 },
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        meta: { type: "date", width: 140 },
      },
    ],
    []
  )
}

/** Same page body in every arrangement, so only the chrome is being compared. */
function DemoContent({ dense }: { dense?: boolean }) {
  const columns = useContentColumns()

  return (
    <>
      <PageHeader
        actions={
          <Button icon="icon-[mdi--plus]" size="sm" variant="primary">
            New page
          </Button>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Content", href: "#" },
          { label: "Pages" },
        ]}
        description="The same page body in every arrangement — only the chrome around it changes."
        title="Pages"
      />
      {!dense && (
        <StatRow>
          <StatCard delta="+6" label="Published" trend="up" value="128" />
          <StatCard label="Drafts" value="14" />
          <StatCard label="Scheduled" value="3" />
        </StatRow>
      )}
      <SectionCard flush>
        <DataTable
          columns={columns}
          data={contentEntries}
          enableGlobalFilter
          enablePagination
          enableSorting
          getRowId={(row) => row.id}
          size="sm"
          striped
          translations={{ searchPlaceholder: "Search pages…" }}
        />
      </SectionCard>
    </>
  )
}

function NavPanel({
  selected,
  onSelect,
  defaultExpanded = ["content"],
}: {
  selected: string
  onSelect: (value: string) => void
  defaultExpanded?: string[]
}) {
  return (
    <Panel label="Main navigation" side="start">
      <Brand />
      <NavList
        defaultExpanded={defaultExpanded}
        nav={adminNav}
        onSelect={onSelect}
        selected={selected}
      />
      <Menu
        aria-label="Account"
        customTrigger={
          <Button
            block
            icon="icon-[mdi--account-circle-outline]"
            size="sm"
            theme="borderless"
            variant="secondary"
          >
            Nora Kessler
          </Button>
        }
        items={accountMenu}
      />
    </Panel>
  )
}

/** Trailing panel: context about the current screen, never navigation. */
function ContextPanel() {
  return (
    <Panel label="Context" side="end" width="md">
      <h2 className="font-semibold text-sm">This screen</h2>
      <DetailList
        items={[
          { term: "Collection", value: "Pages" },
          { term: "Records", value: String(contentEntries.length) },
          { term: "Locale", value: "en-GB" },
          { term: "Owner", value: "Content team" },
        ]}
      />
      <Accordion collapsible defaultValue={["activity"]} multiple>
        <Accordion.Item value="activity">
          <Accordion.Header>
            <Accordion.Title>Recent activity</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            <ul className="flex flex-col gap-150">
              {contentEntries.slice(0, 4).map((entry) => (
                <li className="flex flex-col gap-50" key={entry.id}>
                  <span className="text-sm">{entry.title}</span>
                  <span className="text-fg-secondary text-xs">
                    {entry.author} · {entry.updatedAt}
                  </span>
                </li>
              ))}
            </ul>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="help">
          <Accordion.Header>
            <Accordion.Title>Help</Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>
            <p className="text-fg-secondary text-sm">
              Pages are versioned on every save. Publishing a scheduled page
              early clears its schedule.
            </p>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Panel>
  )
}

export const SidebarLeft: Story = {
  name: "1 · Sidebar left",
  parameters: {
    docs: {
      description: {
        story:
          "The admin default. Navigation leads in reading order, content gets the rest, and the top bar carries only global concerns.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("content-pages")
    return (
      <Frame
        left={<NavPanel onSelect={setNav} selected={nav} />}
        top={
          <TopBar
            center={<GlobalSearch />}
            start={
              <NavDrawer
                defaultExpanded={["content"]}
                nav={adminNav}
                onSelect={setNav}
                selected={nav}
              />
            }
          />
        }
      >
        <DemoContent />
      </Frame>
    )
  },
}

export const SidebarRight: Story = {
  name: "2 · Sidebar right",
  parameters: {
    docs: {
      description: {
        story:
          "Navigation moves into the top bar and the side panel becomes context — activity, help, an assistant. Use when the destination count is small but every screen needs supporting information.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("content-pages")
    return (
      <Frame
        right={<ContextPanel />}
        top={
          <TopBar
            end={
              <Menu
                aria-label="Account"
                customTrigger={
                  <Button
                    icon="icon-[mdi--account-circle-outline]"
                    size="sm"
                    theme="borderless"
                    variant="secondary"
                  >
                    Nora Kessler
                  </Button>
                }
                items={accountMenu}
              />
            }
            start={
              <div className="flex items-center gap-250">
                <Brand />
                <TopNav items={topNavItems} onSelect={setNav} selected={nav} />
              </div>
            }
          />
        }
      >
        <DemoContent />
      </Frame>
    )
  },
}

export const DualSidebar: Story = {
  name: "3 · Dual sidebar",
  parameters: {
    docs: {
      description: {
        story:
          "Navigation left, inspector right. Only worth it on wide desktop tools — below `lg` both panels drop and the content column carries the screen alone.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("content-pages")
    return (
      <Frame
        left={<NavPanel onSelect={setNav} selected={nav} />}
        right={<ContextPanel />}
        top={
          <TopBar
            center={<GlobalSearch />}
            start={
              <NavDrawer
                defaultExpanded={["content"]}
                nav={adminNav}
                onSelect={setNav}
                selected={nav}
              />
            }
          />
        }
      >
        <DemoContent dense />
      </Frame>
    )
  },
}

export const IconRailNav: Story = {
  name: "4 · Icon rail",
  parameters: {
    docs: {
      description: {
        story:
          "Collapsed navigation for products the user already knows. Every target keeps a tooltip and an `aria-label`; the expandable drawer holds the full labelled tree for everyone else.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("content-pages")
    const [drawer, setDrawer] = useState(false)

    return (
      <>
        <Frame
          left={
            <IconRail
              footer={
                <Menu
                  aria-label="Account"
                  customTrigger={
                    <Button
                      icon="icon-[mdi--account-circle-outline]"
                      size="sm"
                      theme="borderless"
                      variant="secondary"
                    />
                  }
                  items={accountMenu}
                />
              }
              items={railItems}
              onSelect={setNav}
              selected={nav}
            />
          }
          top={
            <TopBar
              center={<GlobalSearch />}
              start={
                <Button
                  icon="icon-[mdi--menu]"
                  onClick={() => setDrawer(true)}
                  size="sm"
                  theme="borderless"
                  variant="secondary"
                >
                  Menu
                </Button>
              }
            />
          }
        >
          <DemoContent />
        </Frame>

        <Dialog
          customTrigger
          onOpenChange={(details) => setDrawer(details.open)}
          open={drawer}
          placement="left"
          size="xs"
          title="Navigation"
        >
          <NavList
            defaultExpanded={["content"]}
            nav={adminNav}
            onSelect={(value) => {
              setNav(value)
              setDrawer(false)
            }}
            selected={nav}
          />
        </Dialog>
      </>
    )
  },
}

export const TopNavigation: Story = {
  name: "5 · Top navigation",
  parameters: {
    docs: {
      description: {
        story:
          "No side panel at all: six destinations or fewer, full width for the content. This is also the arrangement that matches a storefront, so a shop's admin and front end feel related.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("content-pages")
    return (
      <Frame
        top={
          <TopBar
            center={<TopNav items={topNavItems} onSelect={setNav} selected={nav} />}
            start={<Brand />}
          />
        }
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-250">
          <DemoContent />
        </div>
      </Frame>
    )
  },
}

export const TopNavWithSubnav: Story = {
  name: "6 · Top nav + sub-nav",
  parameters: {
    docs: {
      description: {
        story:
          "Two navigation levels without a tree: sections in the top bar, the section's own screens in a `Tabs` strip below it. The tab strip belongs to the section, so it changes when the section does.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("content-pages")
    return (
      <Frame
        top={
          <div className="sticky top-0 z-10 flex flex-col border-border-primary border-b bg-base">
            <div className="flex items-center gap-200 p-150">
              <Brand />
              <TopNav items={topNavItems} onSelect={setNav} selected={nav} />
              <div className="ms-auto">
                <GlobalSearch placeholder="Search content…" />
              </div>
            </div>
            {/* The sub-nav belongs to the section, so it changes with it. */}
            <Tabs
              className="px-150"
              key={nav}
              defaultValue={(subNav[nav] ?? DASHBOARD_SUBNAV)[0]?.value}
              variant="line"
            >
              <Tabs.List>
                {(subNav[nav] ?? DASHBOARD_SUBNAV).map((entry) => (
                  <Tabs.Trigger key={entry.value} value={entry.value}>
                    {entry.label}
                  </Tabs.Trigger>
                ))}
                <Tabs.Indicator />
              </Tabs.List>
            </Tabs>
          </div>
        }
      >
        <DemoContent dense />
      </Frame>
    )
  },
}

export const ThreePane: Story = {
  name: "7 · Three pane",
  parameters: {
    docs: {
      description: {
        story:
          "Navigation, a list, and a reading pane. Built for queues: the list keeps its place while the reading pane changes, so a user can work a backlog without re-finding their position.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("sales-orders")
    const [firstOrder] = orders
    const [activeId, setActiveId] = useState(firstOrder?.id ?? "")
    const active = orders.find((order) => order.id === activeId) ?? firstOrder

    return (
      <Frame
        left={
          <NavPanel
            defaultExpanded={["sales"]}
            onSelect={setNav}
            selected={nav}
          />
        }
        top={
          <TopBar
            center={<GlobalSearch />}
            start={
              <NavDrawer
                defaultExpanded={["sales"]}
                nav={adminNav}
                onSelect={setNav}
                selected={nav}
              />
            }
          />
        }
      >
        <div className="flex min-h-0 flex-1 gap-250">
          <div className="hidden w-sm shrink-0 flex-col gap-100 overflow-y-auto rounded-lg border border-border-primary bg-surface p-150 lg:flex">
            {orders.map((order) => (
              <Button
                aria-current={order.id === activeId ? "true" : undefined}
                className={[
                  "flex w-full flex-col items-stretch gap-50 rounded-md p-150 text-start",
                  order.id === activeId ? "bg-overlay" : "hover:bg-overlay",
                ].join(" ")}
                key={order.id}
                onClick={() => setActiveId(order.id)}
                size="current"
                theme="unstyled"
                variant="secondary"
              >
                <span className="flex items-center justify-between gap-150">
                  <span className="font-medium text-sm">{order.number}</span>
                  <StatusBadge status={order.status} />
                </span>
                <span className="text-fg-secondary text-xs">
                  {order.customer} · {currency.format(order.total)}
                </span>
              </Button>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-250">
            {active ? (
              <SectionCard
                actions={
                  <>
                    <Button size="sm" theme="outlined" variant="secondary">
                      Refund
                    </Button>
                    <Button icon="icon-[mdi--truck-outline]" size="sm" variant="primary">
                      Fulfil
                    </Button>
                  </>
                }
                description={`${active.customer} · ${active.email}`}
                title={`Order ${active.number}`}
              >
                <DetailList
                  items={[
                    { term: "Status", value: <StatusBadge status={active.status} /> },
                    { term: "Channel", value: active.channel },
                    { term: "Items", value: String(active.items) },
                    { term: "Total", value: currency.format(active.total) },
                    { term: "Placed", value: active.placedAt },
                  ]}
                />
              </SectionCard>
            ) : (
              <SectionCard>
                <EmptyState
                  description="Pick an order from the list to work on it."
                  title="Nothing selected"
                />
              </SectionCard>
            )}
          </div>
        </div>
      </Frame>
    )
  },
}

export const FullBleedWorkspace: Story = {
  name: "8 · Full-bleed workspace",
  parameters: {
    docs: {
      description: {
        story:
          "The grid is the page. No card, no page padding, a sticky header and a frozen first column — the arrangement for spreadsheets, logs and monitors where every pixel of width is data.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("content-pages")
    const columns = useContentColumns()

    return (
      <Frame
        flush
        left={
          <IconRail items={railItems} onSelect={setNav} selected={nav} />
        }
        top={
          <TopBar
            center={<GlobalSearch placeholder="Search pages…" />}
            start={
              <div className="flex items-center gap-150">
                <Brand environment="Workspace" />
                <Badge size="sm" variant="outline">
                  {`${contentEntries.length} rows`}
                </Badge>
              </div>
            }
          />
        }
      >
        <DataTable
          columnPinning={{ start: ["title"], end: [] }}
          columns={columns}
          data={contentEntries}
          enableColumnFilters
          enableColumnPinning
          enableColumnResizing
          enableColumnVisibility
          enableGlobalFilter
          enableSorting
          getRowId={(row) => row.id}
          maxHeight="calc(100vh - 4rem)"
          size="sm"
          stickyHeader
          striped
          tableLayout="fixed"
        />
      </Frame>
    )
  },
}

export const CenteredColumn: Story = {
  name: "9 · Centered column",
  parameters: {
    docs: {
      description: {
        story:
          "Reading and long-form editing. The measure is capped rather than the viewport filled, because a 1600px-wide paragraph is unreadable however much screen there is.",
      },
    },
  },
  render: function Render() {
    const [nav, setNav] = useState("content-pages")
    return (
      <Frame
        left={<NavPanel onSelect={setNav} selected={nav} />}
        top={
          <TopBar
            center={<GlobalSearch />}
            start={
              <NavDrawer
                defaultExpanded={["content"]}
                nav={adminNav}
                onSelect={setNav}
                selected={nav}
              />
            }
          />
        }
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-250">
          <PageHeader
            breadcrumb={[
              { label: "Home", href: "#" },
              { label: "Content", href: "#" },
              { label: "Editorial guidelines" },
            ]}
            description="Everything the content team agreed on, in one place."
            title="Editorial guidelines"
          />
          <SectionCard title="Voice">
            <p className="max-w-prose text-fg-secondary text-sm">
              Write the way a knowledgeable colleague speaks: direct, specific,
              and never louder than the information. Prefer the plain verb over
              the marketing one.
            </p>
          </SectionCard>
          <SectionCard title="Structure">
            <Accordion collapsible defaultValue={["headings"]} multiple>
              <Accordion.Item value="headings">
                <Accordion.Header>
                  <Accordion.Title>Headings</Accordion.Title>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>
                  <p className="max-w-prose text-fg-secondary text-sm">
                    One H1 per page, sentence case, no trailing punctuation.
                  </p>
                </Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value="links">
                <Accordion.Header>
                  <Accordion.Title>Links</Accordion.Title>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>
                  <p className="max-w-prose text-fg-secondary text-sm">
                    Link the words that describe the destination — never “here”.
                  </p>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </SectionCard>
        </div>
      </Frame>
    )
  },
}

export const FocusedTask: Story = {
  name: "10 · Focused task",
  parameters: {
    docs: {
      description: {
        story:
          "Chrome removed on purpose. A wizard or checkout has exactly one way forward and one way out; leaving navigation on screen only offers ways to abandon the task half-finished.",
      },
    },
  },
  render: () => (
    <Frame
      top={
        <TopBar
          end={
            <Button icon="icon-[mdi--close]" size="sm" theme="borderless" variant="secondary">
              Save and exit
            </Button>
          }
          start={<Brand environment="New import" />}
        />
      }
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-250 py-250">
        <div className="flex flex-col items-center gap-150 text-center">
          <Icon className="text-fg-secondary" icon="icon-[mdi--database-import-outline]" size="xl" />
          <h1 className="font-semibold text-xl">Import products</h1>
          <p className="max-w-prose text-fg-secondary text-sm">
            Three steps: upload the file, map the columns, review what will
            change. Nothing is written until the last step.
          </p>
        </div>
        <SectionCard title="1 · Upload">
          <div className="flex flex-col items-center gap-150 rounded-md border border-border-primary border-dashed p-350 text-center">
            <Icon className="text-fg-secondary" icon="icon-[mdi--file-delimited-outline]" size="xl" />
            <p className="text-sm">Drop a CSV file here</p>
            <Button size="sm" theme="outlined" variant="secondary">
              Choose file
            </Button>
          </div>
        </SectionCard>
        <div className="flex justify-between gap-150">
          <Button theme="borderless" variant="secondary">
            Cancel
          </Button>
          <Button icon="icon-[mdi--arrow-right]" iconPosition="right" variant="primary">
            Continue
          </Button>
        </div>
      </div>
    </Frame>
  ),
}
