import type { Meta, StoryObj } from "@storybook/react"
import { useState, type CSSProperties, type MouseEvent } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

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

async function waitForSidebarMode(
  canvasElement: HTMLElement,
  trigger: HTMLElement
) {
  const breakpoint = canvasElement.querySelector<HTMLElement>(
    '[data-scope="sidebar"][data-part="breakpoint"]'
  )

  if (!breakpoint) {
    throw new Error("Sidebar breakpoint sentinel is missing")
  }

  await waitFor(() => {
    const mobile = getComputedStyle(breakpoint).display === "none"
    return mobile
      ? expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
      : expect(trigger).not.toHaveAttribute("aria-haspopup")
  })
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
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", {
      name: "Toggle start navigation",
    })
    await waitForSidebarMode(canvasElement, trigger)
    const wasExpanded = trigger.getAttribute("aria-expanded") === "true"
    const desktopPanel = canvas.queryByRole("complementary", {
      name: "Primary navigation",
    })

    await userEvent.click(trigger)

    await expect(trigger).toHaveAttribute(
      "aria-expanded",
      wasExpanded ? "false" : "true",
    )
    if (desktopPanel) {
      await expect(args.onExpandedChange).toHaveBeenCalledWith({
        expanded: wasExpanded ? [] : ["start"],
      })
    } else {
      await expect(args.onMobileOpenChange).toHaveBeenCalledWith({
        open: "start",
      })
      await expect(
        canvas.getByRole("button", {
          name: "Close primary navigation",
        })
      ).toBeVisible()
    }
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", {
      name: "Toggle start navigation",
    })
    const state = canvas.getByTestId("controlled-state")

    await waitForSidebarMode(canvasElement, trigger)

    if (trigger.hasAttribute("aria-haspopup")) {
      await expect(state).toHaveTextContent("Desktop: none; mobile: none")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
      await expect(
        canvas.queryByRole("dialog", { name: "Primary navigation" }),
      ).not.toBeInTheDocument()
      await userEvent.click(trigger)
      const dialog = canvas.getByRole("dialog", {
        name: "Primary navigation",
      })
      await expect(dialog).toBeVisible()
      await expect(state).toHaveTextContent("Desktop: none; mobile: start")
      await userEvent.click(
        canvas.getByRole("button", {
          name: "Close primary navigation",
        })
      )
      await waitFor(() => expect(dialog).not.toBeInTheDocument())
      await expect(state).toHaveTextContent("Desktop: none; mobile: none")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
      return
    }

    const panel = canvasElement.querySelector<HTMLElement>(
      '[data-scope="sidebar"][data-part="panel"][data-side="start"]'
    )
    await expect(panel).not.toBeNull()
    await expect(panel).toHaveAttribute("aria-hidden", "true")
    await expect(panel).toHaveAttribute("data-state", "collapsed")
    await userEvent.click(trigger)
    await expect(state).toHaveTextContent("Desktop: start; mobile: none")
    await expect(panel).not.toHaveAttribute("aria-hidden")
    await expect(panel).toHaveAttribute("data-state", "expanded")
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", {
      name: "Toggle start navigation",
    })
    await waitForSidebarMode(canvasElement, trigger)
    const desktopPanel = canvas.queryByRole("complementary", {
      name: "Primary navigation",
    })

    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")

    const panel = canvas.getByRole("complementary", {
      name: "Primary navigation",
    })
    await expect(panel).toHaveAttribute("data-state", "expanded")

    if (desktopPanel) {
      await userEvent.click(trigger)
    } else {
      await userEvent.keyboard("{Escape}")
    }
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", {
      name: "Toggle start navigation",
    })

    await waitForSidebarMode(canvasElement, trigger)

    if (trigger.getAttribute("aria-expanded") === "false") {
      await userEvent.click(trigger)
      const mobileDetailPane = canvas.getByTestId("detail-pane")
      await userEvent.click(canvas.getByRole("link", { name: "Projects" }))
      await expect(mobileDetailPane).not.toHaveAttribute("hidden")
      await expect(canvas.getByText("Projects")).toBeVisible()
      await userEvent.keyboard("{Escape}")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
      return
    }

    const detailPane = canvas.getByTestId("detail-pane")

    await expect(detailPane).not.toHaveAttribute("hidden")
    await userEvent.click(trigger)
    await expect(detailPane).toHaveAttribute("hidden")

    await userEvent.click(canvas.getByRole("link", { name: "Projects" }))
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(detailPane).not.toHaveAttribute("hidden")
    await expect(canvas.getByText("Projects")).toBeVisible()
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", {
      name: "Toggle end navigation",
    })

    await waitForSidebarMode(canvasElement, trigger)

    if (trigger.getAttribute("aria-expanded") === "false") {
      await userEvent.click(trigger)
      const mobilePanel = canvas.getByRole("complementary", {
        name: "Order navigation",
      })
      await expect(mobilePanel).toHaveAttribute("data-side", "end")
      await expect(mobilePanel).toHaveAttribute("data-state", "expanded")
      await userEvent.keyboard("{Escape}")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
      return
    }

    const panel = canvas.getByRole("complementary", {
      name: "Order navigation",
    })

    await expect(panel).toHaveAttribute("data-side", "end")
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(panel).toHaveAttribute("data-state", "collapsed")
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    const startTrigger = canvas.getByRole("button", {
      name: "Toggle start navigation",
    })

    await waitForSidebarMode(canvasElement, startTrigger)

    if (startTrigger.getAttribute("aria-expanded") === "false") {
      await userEvent.click(startTrigger)
      await expect(
        canvas.getByRole("complementary", { name: "Primary navigation" }),
      ).toBeVisible()
      await userEvent.keyboard("{Escape}")
      await expect(startTrigger).toHaveAttribute("aria-expanded", "false")

      const endTrigger = canvas.getByRole("button", {
        name: "Toggle end navigation",
      })
      await userEvent.click(endTrigger)
      await expect(endTrigger).toHaveAttribute("aria-expanded", "true")
      await expect(
        canvas.getByRole("complementary", { name: "Context navigation" }),
      ).toBeVisible()
      await userEvent.keyboard("{Escape}")
      return
    }

    const startPanel = canvas.getByRole("complementary", {
      name: "Primary navigation",
    })
    const endPanel = canvas.getByRole("complementary", {
      name: "Context navigation",
    })

    await expect(
      canvas.queryByRole("button", { name: "Toggle end navigation" }),
    ).not.toBeInTheDocument()
    await expect(startPanel).toHaveAttribute("data-side", "start")
    await expect(endPanel).toHaveAttribute("data-side", "end")
    await userEvent.click(startTrigger)
    await expect(startPanel).toHaveAttribute("data-state", "collapsed")
    await expect(endPanel).toHaveAttribute("data-state", "expanded")
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    const startTrigger = canvas.getByRole("button", {
      name: "Toggle start navigation",
    })

    await waitForSidebarMode(canvasElement, startTrigger)

    if (startTrigger.hasAttribute("aria-haspopup")) {
      await userEvent.click(startTrigger)
      const startPanel = canvas.getByRole("complementary", {
        name: "Primary navigation",
      })
      const startDrawer = startPanel.closest<HTMLElement>(
        '[data-scope="drawer"][data-part="content"]',
      )

      await expect(startDrawer).not.toBeNull()
      await waitFor(() => {
        const rect = startDrawer?.getBoundingClientRect()
        return expect(
          Math.abs((rect?.right ?? 0) - window.innerWidth),
        ).toBeLessThan(1)
      })
      await expect(startDrawer).toHaveAttribute(
        "data-swipe-direction",
        "right",
      )
      await expect(startDrawer).toHaveAttribute("dir", "rtl")
      await userEvent.keyboard("{Escape}")
      await expect(startTrigger).toHaveAttribute("aria-expanded", "false")

      const endTrigger = canvas.getByRole("button", {
        name: "Toggle end navigation",
      })
      await userEvent.click(endTrigger)
      const endPanel = canvas.getByRole("complementary", {
        name: "Context navigation",
      })
      const endDrawer = endPanel.closest<HTMLElement>(
        '[data-scope="drawer"][data-part="content"]',
      )

      await expect(endDrawer).not.toBeNull()
      await waitFor(() => {
        const rect = endDrawer?.getBoundingClientRect()
        return expect(Math.abs(rect?.left ?? 0)).toBeLessThan(1)
      })
      await expect(endDrawer).toHaveAttribute(
        "data-swipe-direction",
        "left",
      )
      await expect(endDrawer).toHaveAttribute("dir", "rtl")
      await userEvent.keyboard("{Escape}")
      return
    }

    const startPanel = canvas.getByRole("complementary", {
      name: "Primary navigation",
    })
    const endPanel = canvas.getByRole("complementary", {
      name: "Context navigation",
    })
    const root = canvasElement.querySelector<HTMLElement>(
      '[data-scope="sidebar"][data-part="root"]',
    )

    await expect(root).not.toBeNull()
    await expect(startPanel).toHaveAttribute("data-side", "start")
    await expect(endPanel).toHaveAttribute("data-side", "end")
    await expect(startPanel.getBoundingClientRect().right).toBeCloseTo(
      root?.getBoundingClientRect().right ?? 0,
    )
    await expect(endPanel.getBoundingClientRect().left).toBeCloseTo(
      root?.getBoundingClientRect().left ?? 0,
    )
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    const root = canvasElement.querySelector<HTMLElement>(
      '[data-scope="sidebar"][data-part="root"]',
    )
    const header = canvas.getByTestId("site-header")
    const applicationRow = canvas.getByTestId("application-row")

    await expect(root).not.toBeNull()
    await expect(header.parentElement).toBe(root)
    await expect(applicationRow.parentElement).toBe(root)
    await expect(
      canvasElement.ownerDocument.defaultView?.getComputedStyle(header)
        .position,
    ).toBe("sticky")

    const rootRect = root?.getBoundingClientRect()
    const headerRect = header.getBoundingClientRect()
    if (rootRect) {
      await expect(Math.abs(headerRect.left - rootRect.left)).toBeLessThan(1)
      await expect(Math.abs(headerRect.right - rootRect.right)).toBeLessThan(1)
    }
  },
}
