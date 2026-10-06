import type { Meta, StoryObj } from "@storybook/react"
import { type MouseEvent, useState } from "react"
import { fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Drawer } from "../../src/molecules/drawer"
import { VerticalNavigation } from "../../src/molecules/vertical-navigation"
import { Sidebar } from "../../src/organisms/sidebar"
import "./vertical-navigation.stories.css"

type NavigationStoryProps = {
  size: "sm" | "md"
  tone: "plain" | "subtle" | "accent"
  variant: "primary" | "secondary"
  indent: boolean
  showGuide: boolean
  dir: "ltr" | "rtl"
}

const onNavigate = fn()
const onOpenChange = fn()

function CategoryNavigation({
  label = "Product categories",
  size = "md",
  tone = "subtle",
  variant = "primary",
  indent = true,
  showGuide = false,
  dir = "ltr",
}: Partial<NavigationStoryProps> & { label?: string }) {
  const [current, setCurrent] = useState("Bolts")

  function navigate(event: MouseEvent<HTMLAnchorElement>, label: string) {
    event.preventDefault()
    setCurrent(label)
    onNavigate(label)
  }

  return (
    <div className="flex min-w-0 flex-col gap-200">
      <VerticalNavigation aria-label={label} dir={dir} size={size}>
        <VerticalNavigation.Group>
          <VerticalNavigation.GroupLabel>Catalog</VerticalNavigation.GroupLabel>
          <VerticalNavigation.List>
            <VerticalNavigation.Item>
              <VerticalNavigation.Link
                current={current === "All products"}
                href="#all-products"
                onClick={(event) => navigate(event, "All products")}
              >
                All products
              </VerticalNavigation.Link>
            </VerticalNavigation.Item>
            <VerticalNavigation.Branch
              containsCurrent={["Bolts", "Nuts"].includes(current)}
              defaultOpen
              onOpenChange={onOpenChange}
            >
              <VerticalNavigation.Row>
                <VerticalNavigation.Link
                  current={current === "Fasteners"}
                  href="#fasteners"
                  onClick={(event) => navigate(event, "Fasteners")}
                >
                  Fasteners
                </VerticalNavigation.Link>
                <VerticalNavigation.BranchTrigger aria-label="Toggle Fasteners">
                  <VerticalNavigation.BranchIndicator />
                </VerticalNavigation.BranchTrigger>
              </VerticalNavigation.Row>
              <VerticalNavigation.BranchContent
                indent={indent}
                showGuide={showGuide}
                tone={tone}
                variant={variant}
              >
                <VerticalNavigation.List>
                  {["Bolts", "Nuts"].map((label) => (
                    <VerticalNavigation.Item key={label}>
                      <VerticalNavigation.Link
                        current={current === label}
                        href={`#${label.toLowerCase()}`}
                        onClick={(event) => navigate(event, label)}
                      >
                        {label}
                      </VerticalNavigation.Link>
                    </VerticalNavigation.Item>
                  ))}
                </VerticalNavigation.List>
              </VerticalNavigation.BranchContent>
            </VerticalNavigation.Branch>
          </VerticalNavigation.List>
        </VerticalNavigation.Group>
        <VerticalNavigation.Separator />
        <VerticalNavigation.Group>
          <VerticalNavigation.GroupLabel>Support</VerticalNavigation.GroupLabel>
          <VerticalNavigation.List>
            <VerticalNavigation.Item>
              <VerticalNavigation.Link
                current={current === "Contact"}
                href="#contact"
                onClick={(event) => navigate(event, "Contact")}
              >
                Contact
              </VerticalNavigation.Link>
            </VerticalNavigation.Item>
          </VerticalNavigation.List>
        </VerticalNavigation.Group>
      </VerticalNavigation>
      <p className="sr-only" data-testid="current-page" role="status">
        Current page: {current}
      </p>
    </div>
  )
}

function NavigationStory(args: NavigationStoryProps) {
  return (
    <div data-navigation-story="">
      <CategoryNavigation {...args} />
    </div>
  )
}

const meta = {
  title: "Molecules/VerticalNavigation",
  component: NavigationStory,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Link-based navigation with independent disclosure branches. A branch's tone styles its descendants without changing the current page. Compose it standalone, inside a Drawer, or inside a Sidebar; keep routing and route-driven expansion in the application.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary"],
      if: { arg: "tone", eq: "accent" },
      description: "Brand color for accent group backgrounds; does not change the current page",
    },
    size: { control: "select", options: ["sm", "md"] },
    tone: {
      control: "select",
      options: ["plain", "subtle", "accent"],
      description: "Appearance of nested groups, not their active state",
    },
    indent: { control: "boolean" },
    showGuide: { control: "boolean" },
    dir: { control: "select", options: ["ltr", "rtl"] },
  },
  args: {
    size: "md",
    tone: "subtle",
    variant: "primary",
    indent: true,
    showGuide: false,
    dir: "ltr",
  },
} satisfies Meta<typeof NavigationStory>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  parameters: { controls: { exclude: ["tone", "variant"] } },
  render: (args) => (
    <VariantContainer>
      {(
        [
          { tone: "plain", variant: "primary", title: "Plain" },
          { tone: "subtle", variant: "primary", title: "Subtle" },
          { tone: "accent", variant: "primary", title: "Accent — primary" },
          { tone: "accent", variant: "secondary", title: "Accent — secondary" },
        ] as const
      ).map(({ tone, variant, title }) => (
        <VariantGroup key={title} title={title}>
          <div data-navigation-story="">
            <CategoryNavigation
              {...args}
              label={`Product categories - ${title}`}
              tone={tone}
              variant={variant}
            />
          </div>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  parameters: { controls: { exclude: ["size"] } },
  render: (args) => (
    <VariantContainer>
      {(["sm", "md"] as const).map((size) => (
        <VariantGroup key={size} title={size}>
          <div data-navigation-story="">
            <CategoryNavigation {...args} label={`Product categories - ${size}`} size={size} />
          </div>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const States: Story = {
  render: ({ size, dir, tone, variant, indent, showGuide }) => (
    <VerticalNavigation
      aria-label="Navigation states"
      data-navigation-story=""
      dir={dir}
      size={size}
    >
      <VerticalNavigation.Group>
        <VerticalNavigation.GroupLabel>Links</VerticalNavigation.GroupLabel>
        <VerticalNavigation.List>
          <VerticalNavigation.Item>
            <VerticalNavigation.Link current href="#overview" onClick={onNavigate}>
              Overview
            </VerticalNavigation.Link>
          </VerticalNavigation.Item>
          <VerticalNavigation.Item>
            <VerticalNavigation.Link disabled href="#unavailable" onClick={onNavigate}>
              Unavailable destination
            </VerticalNavigation.Link>
          </VerticalNavigation.Item>
        </VerticalNavigation.List>
      </VerticalNavigation.Group>
      <VerticalNavigation.Separator />
      <VerticalNavigation.Group>
        <VerticalNavigation.GroupLabel>Categories</VerticalNavigation.GroupLabel>
        <VerticalNavigation.List>
          <VerticalNavigation.Branch onOpenChange={onOpenChange}>
            <VerticalNavigation.BranchTrigger>
              Collapsed category
              <VerticalNavigation.BranchIndicator />
            </VerticalNavigation.BranchTrigger>
            <VerticalNavigation.BranchContent
              tone={tone}
              variant={variant}
              indent={indent}
              showGuide={showGuide}
            >
              <VerticalNavigation.List>
                <VerticalNavigation.Item>
                  <VerticalNavigation.Link href="#hidden-destination" onClick={onNavigate}>
                    Hidden destination
                  </VerticalNavigation.Link>
                </VerticalNavigation.Item>
              </VerticalNavigation.List>
            </VerticalNavigation.BranchContent>
          </VerticalNavigation.Branch>
          <VerticalNavigation.Branch disabled>
            <VerticalNavigation.BranchTrigger>
              Unavailable category
              <VerticalNavigation.BranchIndicator />
            </VerticalNavigation.BranchTrigger>
            <VerticalNavigation.BranchContent
              tone={tone}
              variant={variant}
              indent={indent}
              showGuide={showGuide}
            >
              <VerticalNavigation.List>
                <VerticalNavigation.Item>
                  <VerticalNavigation.Link href="#restricted">
                    Restricted destination
                  </VerticalNavigation.Link>
                </VerticalNavigation.Item>
              </VerticalNavigation.List>
            </VerticalNavigation.BranchContent>
          </VerticalNavigation.Branch>
        </VerticalNavigation.List>
      </VerticalNavigation.Group>
    </VerticalNavigation>
  ),
}

type Category = {
  id: string
  label: string
  tone?: NavigationStoryProps["tone"]
  variant?: NavigationStoryProps["variant"]
  defaultOpen?: boolean
  children?: Category[]
}

const categories: Category[] = [
  {
    id: "stainless",
    label: "Stainless steel fasteners",
    children: [
      {
        id: "bolts",
        label: "Bolts",
        children: [
          {
            id: "metric",
            label: "Metric thread bolts",
            children: [
              {
                id: "hexagonal",
                label: "Hexagonal head",
                tone: "accent",
                children: [
                  {
                    id: "fully-threaded",
                    label: "Fully threaded bolts",
                    children: [
                      {
                        id: "din-933",
                        label: "DIN 933",
                        children: [
                          { id: "a2", label: "A2 stainless steel" },
                          { id: "a4", label: "A4 stainless steel" },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { id: "tools", label: "Tools and accessories" },
]

function containsPage(category: Category, current: string): boolean {
  return (
    category.id === current ||
    Boolean(category.children?.some((child) => containsPage(child, current)))
  )
}

function CategoryItems({
  items,
  current,
  navigate,
  showGuide = false,
}: {
  items: Category[]
  current: string
  navigate: (event: MouseEvent<HTMLAnchorElement>, category: Category) => void
  showGuide?: boolean
}) {
  return (
    <VerticalNavigation.List>
      {items.map((category) => {
        const link = (
          <VerticalNavigation.Link
            current={category.id === current}
            href={`#${category.id}`}
            onClick={(event) => navigate(event, category)}
          >
            {category.label}
          </VerticalNavigation.Link>
        )

        if (!category.children) {
          return <VerticalNavigation.Item key={category.id}>{link}</VerticalNavigation.Item>
        }

        return (
          <VerticalNavigation.Branch
            containsCurrent={category.children.some((child) => containsPage(child, current))}
            defaultOpen={category.defaultOpen ?? containsPage(category, "a2")}
            key={category.id}
          >
            <VerticalNavigation.Row>
              {link}
              <VerticalNavigation.BranchTrigger aria-label={`Toggle ${category.label}`}>
                <VerticalNavigation.BranchIndicator />
              </VerticalNavigation.BranchTrigger>
            </VerticalNavigation.Row>
            <VerticalNavigation.BranchContent
              showGuide={showGuide}
              tone={category.tone}
              variant={category.variant}
            >
              <CategoryItems
                current={current}
                items={category.children}
                navigate={navigate}
                showGuide={showGuide}
              />
            </VerticalNavigation.BranchContent>
          </VerticalNavigation.Branch>
        )
      })}
    </VerticalNavigation.List>
  )
}

function SevenLevelsExample() {
  const [current, setCurrent] = useState({ id: "a2", label: "A2 stainless steel" })

  return (
    <div data-navigation-story="">
      <VerticalNavigation aria-label="Seven-level product catalog" maxIndentDepth={7} size="sm">
        <CategoryItems
          current={current.id}
          items={categories}
          navigate={(event, category) => {
            event.preventDefault()
            setCurrent(category)
            onNavigate(category.id)
          }}
        />
      </VerticalNavigation>
      <p className="sr-only" data-testid="current-page" role="status">
        Current page: {current.label}
      </p>
    </div>
  )
}

export const SevenLevels: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Seven nested lists in a 280 px column. The small size and maxIndentDepth={7} preserve visible indentation at every level; long labels wrap. Only one subgroup is tinted, independently of the current page.",
      },
    },
  },
  render: () => <SevenLevelsExample />,
}

function ControlledExample() {
  const [open, setOpen] = useState(false)
  const [rejectChanges, setRejectChanges] = useState(true)
  const [changeCount, setChangeCount] = useState(0)

  return (
    <div className="flex flex-col gap-200" data-navigation-story="">
      <Button
        aria-pressed={rejectChanges}
        onClick={() => setRejectChanges(!rejectChanges)}
        theme="outlined"
        size="sm"
      >
        Reject changes
      </Button>
      <Button onClick={() => setOpen(true)} size="sm" theme="outlined">
        Reveal current page
      </Button>
      <VerticalNavigation aria-label="Controlled categories">
        <VerticalNavigation.List>
          <VerticalNavigation.Branch
            containsCurrent
            onOpenChange={(details) => {
              setChangeCount((count) => count + 1)
              onOpenChange(details)
              if (!rejectChanges) {
                setOpen(details.open)
              }
            }}
            open={open}
          >
            <VerticalNavigation.BranchTrigger aria-label="Toggle controlled branch">
              Controlled branch
              <VerticalNavigation.BranchIndicator />
            </VerticalNavigation.BranchTrigger>
            <VerticalNavigation.BranchContent tone="subtle">
              <VerticalNavigation.List>
                <VerticalNavigation.Item>
                  <VerticalNavigation.Link current href="#controlled-child">
                    Controlled destination
                  </VerticalNavigation.Link>
                </VerticalNavigation.Item>
              </VerticalNavigation.List>
            </VerticalNavigation.BranchContent>
          </VerticalNavigation.Branch>
        </VerticalNavigation.List>
      </VerticalNavigation>
      <p className="text-fg-primary text-sm" data-testid="controlled-open-state">
        {open ? "Open" : "Closed"}
      </p>
      <p className="sr-only" data-testid="open-change-count">
        {changeCount}
      </p>
    </div>
  )
}

export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: () => <ControlledExample />,
}

export const WithinDrawer: Story = {
  render: (args) => (
    <Drawer placement="start" size="sm">
      <Drawer.Trigger>Browse categories</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Product catalog</Drawer.Title>
              <Drawer.Description className="text-fg-primary">
                Choose a product category.
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body>
              <CategoryNavigation {...args} />
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.CloseTrigger>Close catalog</Drawer.CloseTrigger>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Portal>
    </Drawer>
  ),
}

export const WithinSidebar: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <Sidebar collapsible={{ start: "none" }}>
      <Sidebar.Panel aria-label="Catalog sidebar">
        <Sidebar.Header>
          <div className="flex items-center gap-100">
            <span className="min-w-0 flex-1 font-semibold text-fg-primary text-sm">
              Product catalog
            </span>
            <Sidebar.CloseTrigger aria-label="Close categories" />
          </div>
        </Sidebar.Header>
        <Sidebar.Content>
          <CategoryNavigation {...args} />
        </Sidebar.Content>
      </Sidebar.Panel>
      <Sidebar.Inset>
        <div className="flex flex-col gap-200 p-200">
          <Sidebar.Trigger aria-label="Browse categories" side="start" />
          <p className="text-fg-primary text-sm">
            The Sidebar owns layout and its mobile Drawer. The navigation owns links and disclosure
            branches.
          </p>
        </div>
      </Sidebar.Inset>
    </Sidebar>
  ),
}

export const RTL: Story = { args: { dir: "rtl" } }

const akrosCategories: Category[] = [
  {
    id: "stainless",
    label: "Nerezový spojovací materiál",
    children: [
      {
        id: "screws",
        label: "Šrouby",
        children: [
          {
            id: "metric",
            label: "Šrouby s metrickým závitem",
            tone: "accent",
            variant: "primary",
            children: [
              {
                id: "hexagonal",
                label: "Šrouby se šestihrannou hlavou",
                children: [
                  { id: "din-931", label: "DIN 931" },
                  {
                    id: "din-933",
                    label: "DIN 933",
                    children: [
                      { id: "a2", label: "A 2" },
                      { id: "a4", label: "A 4" },
                      { id: "a4-80", label: "A 4-80" },
                      { id: "a4-70", label: "A 4-70" },
                      { id: "a2-80", label: "A 2-80" },
                    ],
                  },
                  { id: "din-933-sz", label: "DIN 933 SZ" },
                  { id: "din-933-z1", label: "DIN 933 Z1" },
                ],
              },
            ],
          },
          {
            id: "sheet-metal",
            label: "Do plechu",
            tone: "accent",
            variant: "secondary",
            defaultOpen: true,
            children: [{ id: "bimetal", label: "Bimetalové" }],
          },
          { id: "thread-forming", label: "Závitotvářecí" },
          { id: "plastic", label: "Do plastu" },
          { id: "facade", label: "Fasádové" },
          { id: "concrete", label: "Do betonu" },
        ],
      },
    ],
  },
  { id: "metallurgical", label: "Nerezový hutní materiál" },
]

function AkrosCatalogExample() {
  const [current, setCurrent] = useState({ id: "a2", label: "A 2" })
  function navigate(event: MouseEvent<HTMLAnchorElement>, category: Category) {
    event.preventDefault()
    setCurrent(category)
    onNavigate(category.id)
  }
  return (
    <div data-navigation-story="">
      <VerticalNavigation aria-label="Katalog Akros" maxIndentDepth={7} size="sm">
        <VerticalNavigation.Group>
          <VerticalNavigation.GroupLabel>Katalog</VerticalNavigation.GroupLabel>
          <CategoryItems
            current={current.id}
            items={[
              { id: "special", label: "Speciální kategorie" },
              { id: "production", label: "AKROSCZ Výroba" },
            ]}
            navigate={navigate}
          />
        </VerticalNavigation.Group>
        <VerticalNavigation.Separator />
        <VerticalNavigation.Group>
          <VerticalNavigation.GroupLabel>Materiál a sortiment</VerticalNavigation.GroupLabel>
          <CategoryItems current={current.id} items={akrosCategories} navigate={navigate} />
        </VerticalNavigation.Group>
        <VerticalNavigation.Separator />
        <VerticalNavigation.Group>
          <VerticalNavigation.GroupLabel>Průvodce nákupem</VerticalNavigation.GroupLabel>
          <CategoryItems
            current={current.id}
            items={[
              { id: "help", label: "Mohlo by vás zajímat…" },
              { id: "getting-started", label: "První kroky v e-shopu" },
            ]}
            navigate={navigate}
          />
        </VerticalNavigation.Group>
      </VerticalNavigation>
      <p className="sr-only" role="status">
        Aktuální kategorie: {current.label}
      </p>
    </div>
  )
}

export const AkrosCatalog: Story = {
  name: "Akros — katalog",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Katalog Akros ve velikosti sm na šířce 280 px. maxIndentDepth={7} zachovává odsazení hlubších úrovní; primary/secondary rozlišují podskupiny nezávisle na aktuální stránce. Hierarchie je ilustrativní, nejde o produkční katalogová data.",
      },
    },
  },
  render: () => <AkrosCatalogExample />,
}
