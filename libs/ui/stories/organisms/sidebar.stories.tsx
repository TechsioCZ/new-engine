import type { Meta, StoryObj } from "@storybook/react"
import { useState, type CSSProperties, type MouseEvent } from "react"
import { fn } from "storybook/test"

import { Button } from "../../src/atoms/button"
import type { IconType } from "../../src/atoms/icon"
import { LinkButton } from "../../src/atoms/link-button"
import { Tooltip } from "../../src/atoms/tooltip"
import { Header } from "../../src/organisms/header"
import {
  Sidebar,
  type SidebarSide,
} from "../../src/organisms/sidebar"

type NavigationItem = {
  href: string
  icon: IconType
  label: string
}

const navigationItems: NavigationItem[] = [
  {
    href: "#overview",
    icon: "icon-[mdi--view-dashboard-outline]",
    label: "Overview",
  },
  {
    href: "#orders",
    icon: "icon-[mdi--receipt-text-outline]",
    label: "Orders",
  },
  {
    href: "#catalog",
    icon: "icon-[mdi--package-variant-closed]",
    label: "Catalog",
  },
]

const initialPaneItem: NavigationItem = {
  href: "#inbox",
  icon: "icon-[mdi--inbox-outline]",
  label: "Inbox",
}

const paneItems: NavigationItem[] = [
  initialPaneItem,
  {
    href: "#projects",
    icon: "icon-[mdi--folder-outline]",
    label: "Projects",
  },
  {
    href: "#archive",
    icon: "icon-[mdi--archive-outline]",
    label: "Archive",
  },
]

function preventNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

function getSidebarTooltipPlacement(
  side: SidebarSide,
  dir: "ltr" | "rtl",
) {
  if (side === "start") {
    return dir === "rtl" ? "left" : "right"
  }

  return dir === "rtl" ? "right" : "left"
}

function NavigationLink({
  active = false,
  item,
  side,
}: {
  active?: boolean
  item: NavigationItem
  side: SidebarSide
}) {
  return (
    <Sidebar.Context>
      {(api) => {
        const link = (
          <LinkButton
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            block
            href={item.href}
            icon={item.icon}
            onClick={preventNavigation}
            size="sm"
            theme={active ? "light" : "unstyled"}
            variant="secondary"
          >
            <Sidebar.Label>{item.label}</Sidebar.Label>
          </LinkButton>
        )

        if (!api.isDesktop || api.isExpanded(side)) {
          return link
        }

        return (
          <Tooltip
            content={item.label}
            dir={api.dir}
            placement={getSidebarTooltipPlacement(side, api.dir)}
          >
            {link}
          </Tooltip>
        )
      }}
    </Sidebar.Context>
  )
}

function StandardPanel({
  activeHref = "#overview",
  label,
  side = "start",
}: {
  activeHref?: string
  label: string
  side?: SidebarSide
}) {
  return (
    <Sidebar.Panel aria-label={label} side={side}>
      <Sidebar.Header>
        <div className="flex items-center gap-100">
          <LinkButton
            aria-label="Commerce workspace"
            block
            className="min-w-0 flex-1"
            href="#workspace"
            icon="icon-[mdi--storefront-outline]"
            onClick={preventNavigation}
            size="sm"
            theme="unstyled"
            variant="secondary"
          >
            <Sidebar.Label>Commerce</Sidebar.Label>
          </LinkButton>
          <Sidebar.CloseTrigger
            aria-label={`Close ${label.toLowerCase()}`}
          />
        </div>
      </Sidebar.Header>

      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.Expanded>
            <Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
          </Sidebar.Expanded>
          <Sidebar.GroupContent>
            <Sidebar.Menu>
              {navigationItems.map((item) => (
                <Sidebar.Item key={item.href}>
                  <NavigationLink
                    active={item.href === activeHref}
                    item={item}
                    side={side}
                  />
                </Sidebar.Item>
              ))}
            </Sidebar.Menu>
          </Sidebar.GroupContent>
        </Sidebar.Group>
      </Sidebar.Content>

      <Sidebar.Footer>
        <LinkButton
          aria-label="Account settings"
          block
          href="#settings"
          icon="icon-[mdi--cog-outline]"
          onClick={preventNavigation}
          size="sm"
          theme="unstyled"
          variant="secondary"
        >
          <Sidebar.Label>Settings</Sidebar.Label>
        </LinkButton>
      </Sidebar.Footer>
      <Sidebar.Rail aria-label={`Toggle ${label.toLowerCase()}`} />
    </Sidebar.Panel>
  )
}

function DashboardHeader({
  side = "start",
  title,
}: {
  side?: SidebarSide
  title: string
}) {
  return (
    <Header className="border-b border-border-primary bg-base p-200">
      <div className="flex w-full items-center gap-200">
        <Sidebar.Trigger
          aria-label={`Toggle ${side} navigation`}
          side={side}
          tooltip="Toggle navigation"
        />
        <strong className="text-fg-primary">{title}</strong>
      </div>
    </Header>
  )
}

function DashboardContent({ title }: { title: string }) {
  return (
    <div className="grid min-h-screen gap-300 bg-base p-300">
      <section aria-labelledby="dashboard-heading" className="grid gap-100">
        <h1 className="text-fg-primary" id="dashboard-heading">
          {title}
        </h1>
        <p className="text-fg-secondary">
          Revenue, orders, and catalog activity for the current storefront.
        </p>
      </section>
      <div className="grid grid-cols-2 gap-200 md:grid-cols-3">
        {[
          ["Gross sales", "$48,290"],
          ["Orders", "1,284"],
          ["Conversion", "4.8%"],
        ].map(([label, value]) => (
          <section
            className="grid gap-100 rounded-md border border-border-primary bg-surface p-300"
            key={label}
          >
            <span className="text-fg-secondary">{label}</span>
            <strong className="text-fg-primary">{value}</strong>
          </section>
        ))}
      </div>
    </div>
  )
}

function MainSurface({
  side = "start",
  title,
}: {
  side?: SidebarSide
  title: string
}) {
  return (
    <Sidebar.Inset>
      <DashboardHeader side={side} title={title} />
      <DashboardContent title={title} />
    </Sidebar.Inset>
  )
}

const meta = {
  title: "Organisms/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "A responsive application shell with independently controlled logical start and end panels.",
      },
    },
  },
  args: {
    defaultExpanded: ["start"],
    dir: "ltr",
    onExpandedChange: fn(),
    onMobileOpenChange: fn(),
  },
  argTypes: {
    defaultExpanded: {
      control: "check",
      options: ["start", "end"],
    },
    dir: {
      control: "inline-radio",
      options: ["ltr", "rtl"],
    },
    defaultMobileOpen: { control: false },
    collapsible: { control: false },
    expanded: { control: false },
    id: { control: false },
    mobileOpen: { control: false },
    onExpandedChange: { control: false },
    onMobileOpenChange: { control: false },
  },
} satisfies Meta<typeof Sidebar>

export default meta

type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <Sidebar {...args}>
      <StandardPanel label="Primary navigation" />
      <MainSurface title="Store overview" />
    </Sidebar>
  ),
}

function ControlledOffcanvasExample() {
  const [expanded, setExpanded] = useState<readonly SidebarSide[]>([])
  const [mobileOpen, setMobileOpen] = useState<SidebarSide | null>(null)

  return (
    <Sidebar
      collapsible={{ start: "offcanvas" }}
      defaultMobileOpen="start"
      expanded={expanded}
      mobileOpen={mobileOpen}
      onExpandedChange={({ expanded: next }) => setExpanded(next)}
      onMobileOpenChange={({ open }) => setMobileOpen(open)}
    >
      <StandardPanel label="Primary navigation" />
      <Sidebar.Inset>
        <DashboardHeader title="Controlled shell" />
        <p
          aria-live="polite"
          className="bg-base px-300 pt-300 text-fg-secondary text-sm"
          data-testid="controlled-state"
        >
          Desktop: {expanded.join(", ") || "none"}; mobile:{" "}
          {mobileOpen ?? "none"}
        </p>
        <DashboardContent title="Controlled shell" />
      </Sidebar.Inset>
    </Sidebar>
  )
}

export const ControlledOffcanvas: Story = {
  name: "State - Controlled offcanvas",
  args: {},
  render: () => <ControlledOffcanvasExample />,
}

function FocusTransferExample() {
  const [autoFocusDesktop, setAutoFocusDesktop] = useState(false)

  return (
    <Sidebar defaultExpanded={["start"]}>
      <Sidebar.Panel aria-label="Focus test navigation" side="start">
        <Sidebar.Header>
          <Sidebar.CloseTrigger aria-label="Close focus test navigation" />
        </Sidebar.Header>
        <Sidebar.Content className="gap-100">
          <Button data-testid="panel-focus-control" size="sm">
            Panel focus control
          </Button>
          <Button
            data-testid="arm-replacement-autofocus"
            onClick={() => setAutoFocusDesktop(true)}
            size="sm"
            theme="outlined"
          >
            Arm replacement autofocus
          </Button>
          <Sidebar.Context>
            {(api) => (
              <Button
                autoFocus={autoFocusDesktop && api.isDesktop}
                data-testid="replacement-autofocus"
                size="sm"
                theme="light"
              >
                Replacement focus target
              </Button>
            )}
          </Sidebar.Context>
        </Sidebar.Content>
      </Sidebar.Panel>
      <Sidebar.Inset>
        <Header className="border-b border-border-primary bg-base p-200">
          <div className="flex w-full items-center gap-200">
            <Sidebar.Trigger
              aria-label="Toggle focus navigation primary"
              side="start"
              value="focus-primary"
            />
            <Sidebar.Trigger
              aria-label="Toggle focus navigation secondary"
              side="start"
              value="focus-secondary"
            />
            <strong className="text-fg-primary">Focus transfer</strong>
          </div>
        </Header>
        <DashboardContent title="Focus transfer" />
      </Sidebar.Inset>
    </Sidebar>
  )
}

export const BreakpointFocusTransfer: Story = {
  name: "State - Breakpoint focus transfer",
  args: {},
  render: () => <FocusTransferExample />,
}

export const IconCollapseSidebar07: Story = {
  name: "Sidebar 07 - Icon collapse",
  args: {
    defaultExpanded: [],
  },
  render: (args) => (
    <Sidebar {...args}>
      <StandardPanel label="Primary navigation" />
      <MainSurface title="Store overview" />
    </Sidebar>
  ),
}

function PaneSwitcher({
  active,
  item,
  onSelect,
}: {
  active: boolean
  item: NavigationItem
  onSelect: (item: NavigationItem) => void
}) {
  return (
    <Sidebar.Context>
      {(api) => (
        <Tooltip
          content={item.label}
          dir={api.dir}
          placement={getSidebarTooltipPlacement("start", api.dir)}
        >
          <LinkButton
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            href={item.href}
            icon={item.icon}
            onClick={(event) => {
              event.preventDefault()
              onSelect(item)
              api.setExpanded("start", true)
            }}
            size="sm"
            theme={active ? "light" : "unstyled"}
            variant="secondary"
          />
        </Tooltip>
      )}
    </Sidebar.Context>
  )
}

function TwoPanePanel() {
  const [activeItem, setActiveItem] =
    useState<NavigationItem>(initialPaneItem)

  return (
    <Sidebar.Panel aria-label="Workspace navigation" side="start">
      <Sidebar.PaneGroup>
        <Sidebar.Pane
          aria-label="Workspace switcher"
          role="navigation"
          size="rail"
        >
          <Sidebar.Header>
            <LinkButton
              aria-label="Commerce workspace"
              href="#workspace"
              icon="icon-[mdi--storefront-outline]"
              onClick={preventNavigation}
              size="sm"
              theme="unstyled"
              variant="secondary"
            />
          </Sidebar.Header>
          <Sidebar.Content>
            <Sidebar.Menu>
              {paneItems.map((item) => (
                <Sidebar.Item key={item.href}>
                  <PaneSwitcher
                    active={activeItem.href === item.href}
                    item={item}
                    onSelect={setActiveItem}
                  />
                </Sidebar.Item>
              ))}
            </Sidebar.Menu>
          </Sidebar.Content>
          <Sidebar.Footer>
            <LinkButton
              aria-label="Account settings"
              href="#settings"
              icon="icon-[mdi--cog-outline]"
              onClick={preventNavigation}
              size="sm"
              theme="unstyled"
              variant="secondary"
            />
          </Sidebar.Footer>
        </Sidebar.Pane>

        <Sidebar.Pane
          aria-label={`${activeItem.label} navigation`}
          data-testid="detail-pane"
          role="navigation"
          size="content"
          visibility="expanded"
        >
          <Sidebar.Header>
            <strong className="text-fg-primary">{activeItem.label}</strong>
          </Sidebar.Header>
          <Sidebar.Content>
            <Sidebar.Menu>
              {["Assigned to me", "Recently updated", "All items"].map(
                (label, index) => (
                  <Sidebar.Item key={label}>
                    <LinkButton
                      aria-current={index === 0 ? "page" : undefined}
                      block
                      href={`#${activeItem.label.toLowerCase()}-${index}`}
                      onClick={preventNavigation}
                      size="sm"
                      theme={index === 0 ? "light" : "unstyled"}
                      variant="secondary"
                    >
                      {label}
                    </LinkButton>
                  </Sidebar.Item>
                ),
              )}
            </Sidebar.Menu>
          </Sidebar.Content>
        </Sidebar.Pane>
      </Sidebar.PaneGroup>
      <Sidebar.Rail aria-label="Toggle workspace navigation" />
    </Sidebar.Panel>
  )
}

export const TwoPaneSidebar09: Story = {
  name: "Sidebar 09 - Two physical panes",
  render: (args) => (
    <Sidebar {...args}>
      <TwoPanePanel />
      <MainSurface title="Team workspace" />
    </Sidebar>
  ),
}

export const RightSidebar14: Story = {
  name: "Sidebar 14 - Right",
  args: {
    defaultExpanded: ["end"],
  },
  render: (args) => (
    <Sidebar {...args}>
      <MainSurface side="end" title="Order details" />
      <StandardPanel
        activeHref="#orders"
        label="Order navigation"
        side="end"
      />
    </Sidebar>
  ),
}

function DualSidebarHeader() {
  return (
    <Header className="border-b border-border-primary bg-base p-200">
      <div className="flex w-full items-center gap-200">
        <Sidebar.Trigger
          aria-label="Toggle start navigation"
          side="start"
          tooltip="Toggle primary navigation"
        />
        <strong className="text-fg-primary">Operations</strong>
        <Sidebar.Trigger
          aria-label="Toggle end navigation"
          side="end"
          tooltip="Toggle context navigation"
        />
      </div>
    </Header>
  )
}

export const LeftAndRightSidebar15: Story = {
  name: "Sidebar 15 - Left and right",
  args: {
    defaultExpanded: ["start", "end"],
  },
  render: (args) => (
    <Sidebar {...args} collapsible={{ end: "none" }}>
      <StandardPanel label="Primary navigation" />
      <Sidebar.Inset>
        <DualSidebarHeader />
        <DashboardContent title="Operations" />
      </Sidebar.Inset>
      <StandardPanel
        activeHref="#orders"
        label="Context navigation"
        side="end"
      />
    </Sidebar>
  ),
}

export const LogicalEdgesRtl: Story = {
  name: "RTL - Logical edges",
  args: {
    defaultExpanded: ["start", "end"],
    dir: "rtl",
  },
  render: (args) => (
    <Sidebar {...args} collapsible={{ end: "none" }}>
      <StandardPanel label="Primary navigation" />
      <Sidebar.Inset>
        <DualSidebarHeader />
        <DashboardContent title="RTL operations" />
      </Sidebar.Inset>
      <StandardPanel
        activeHref="#orders"
        label="Context navigation"
        side="end"
      />
    </Sidebar>
  ),
}

type SidebarOffsetStyle = CSSProperties & {
  "--spacing-sidebar-offset"?: string
}

const sidebarOffsetStyle: SidebarOffsetStyle = {
  "--spacing-sidebar-offset": "var(--spacing-700)",
}

const stickyHeaderStyle: CSSProperties = {
  height: "var(--spacing-700)",
}

export const StickySiteHeaderSidebar16: Story = {
  name: "Sidebar 16 - Sticky full-width header",
  render: (args) => (
    <Sidebar {...args} className="flex-col" style={sidebarOffsetStyle}>
      <Header
        className="sticky top-0 w-full max-w-none border-b border-border-primary bg-base p-200"
        data-testid="site-header"
        style={stickyHeaderStyle}
      >
        <div className="flex w-full items-center gap-200">
          <Sidebar.Trigger
            aria-label="Toggle start navigation"
            side="start"
            tooltip="Toggle primary navigation"
          />
          <strong className="text-fg-primary">Commerce admin</strong>
        </div>
      </Header>
      <div className="flex min-h-0 flex-1" data-testid="application-row">
        <StandardPanel label="Primary navigation" />
        <Sidebar.Inset>
          <DashboardContent title="Store performance" />
        </Sidebar.Inset>
      </div>
    </Sidebar>
  ),
}
