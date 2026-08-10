import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import type { ReactNode } from "react"

import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Checkbox } from "../../src/atoms/checkbox"
import { Icon } from "../../src/atoms/icon"
import { Image } from "../../src/atoms/image"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { Link } from "../../src/atoms/link"
import { NumericInput } from "../../src/atoms/numeric-input"
import { Rating } from "../../src/atoms/rating"
import { Skeleton } from "../../src/atoms/skeleton"
import { StatusText } from "../../src/atoms/status-text"
import { Textarea } from "../../src/atoms/textarea"
import { Tooltip } from "../../src/atoms/tooltip"
import { Accordion } from "../../src/molecules/accordion"
import { Carousel } from "../../src/molecules/carousel"
import type { CarouselSlide } from "../../src/molecules/carousel"
import { ColorSelect } from "../../src/molecules/color-select"
import { Combobox } from "../../src/molecules/combobox"
import type { ComboboxItem } from "../../src/molecules/combobox"
import { Dialog } from "../../src/molecules/dialog"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { FormInput } from "../../src/molecules/form-input"
import { FormNumericInput } from "../../src/molecules/form-numeric-input"
import { FormTextarea } from "../../src/molecules/form-textarea"
import { Menu } from "../../src/molecules/menu"
import type { MenuItem } from "../../src/molecules/menu"
import { Pagination } from "../../src/molecules/pagination"
import { Popover } from "../../src/molecules/popover"
import { ProductCard } from "../../src/molecules/product-card"
import { SearchForm } from "../../src/molecules/search-form"
import { Select } from "../../src/molecules/select"
import type { SelectItem } from "../../src/molecules/select"
import { Slider } from "../../src/molecules/slider"
import { Steps } from "../../src/molecules/steps"
import { Switch } from "../../src/molecules/switch"
import { Tabs } from "../../src/molecules/tabs"
import { Toaster, useToast } from "../../src/molecules/toast"
import { TreeView } from "../../src/molecules/tree-view"
import type { TreeNode } from "../../src/molecules/tree-view"
import { Footer } from "../../src/organisms/footer"
import { Header } from "../../src/organisms/header"
import { Table } from "../../src/organisms/table"
import { BreadcrumbTemplate } from "../../src/templates/breadcrumb"
import type { BreadcrumbTemplateItem } from "../../src/templates/breadcrumb"

const meta: Meta = {
  parameters: {
    layout: "fullscreen",
  },
  tags: ["comparison"],
  title: "Overview/Component Comparison",
}

export default meta
type Story = StoryObj

interface ComponentCardProps {
  title: string
  children: ReactNode
  className?: string
  bodyClassName?: string
}

const ComponentCard = ({
  title,
  children,
  className,
  bodyClassName,
}: ComponentCardProps) => (
  <div
    className={`flex min-w-0 flex-col gap-200 rounded-md border border-border-primary p-300 ${className ?? ""}`}
  >
    <div className="text-sm font-semibold text-fg-secondary">{title}</div>
    <div className={bodyClassName ?? "flex flex-wrap items-center gap-200"}>
      {children}
    </div>
  </div>
)

interface SectionProps {
  title: string
  description?: string
  children: ReactNode
  gridClassName?: string
}

const Section = ({
  title,
  description,
  children,
  gridClassName,
}: SectionProps) => (
  <section className="flex flex-col gap-300">
    <div className="flex flex-col gap-100">
      <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
      {description !== undefined && description !== "" && (
        <p className="text-sm text-fg-secondary">{description}</p>
      )}
    </div>
    <div
      className={
        gridClassName ??
        "grid grid-cols-1 gap-300 md:grid-cols-2 xl:grid-cols-3"
      }
    >
      {children}
    </div>
  </section>
)

const comparisonSizes: ("sm" | "md")[] = ["sm", "md"]

const breadcrumbItems: BreadcrumbTemplateItem[] = [
  { href: "#", label: "Home" },
  { href: "#", label: "Catalog" },
  { href: "#", isCurrent: true, label: "Item" },
]

const comboboxItems: ComboboxItem[] = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry" },
]

const selectItems: SelectItem[] = [
  { label: "United States", value: "us" },
  { label: "Canada", value: "ca" },
  { label: "Mexico", value: "mx" },
]

const menuItems: MenuItem[] = [
  {
    icon: "icon-[mdi--pencil]",
    label: "Edit",
    type: "action",
    value: "edit",
  },
  {
    icon: "icon-[mdi--content-copy]",
    label: "Duplicate",
    type: "action",
    value: "duplicate",
  },
  { id: "menu-sep-1", type: "separator" },
  {
    icon: "icon-[mdi--archive]",
    label: "Archive",
    type: "action",
    value: "archive",
  },
]

const colorOptions = [
  { color: "var(--color-primary)", label: "Primary", selected: true },
  { color: "var(--color-secondary)", label: "Secondary" },
  { color: "var(--color-tertiary)", label: "Tertiary" },
]

const carouselImageClassName = "h-full w-full"

const carouselSlides = [
  {
    alt: "Beautiful landscape",
    id: "slide-1",
    imageProps: { className: carouselImageClassName, size: "custom" },
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
  },
  {
    alt: "City skyline",
    id: "slide-2",
    imageProps: { className: carouselImageClassName, size: "custom" },
    src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
  },
  {
    alt: "Ocean view",
    id: "slide-3",
    imageProps: { className: carouselImageClassName, size: "custom" },
    src: "https://images.unsplash.com/photo-1747258294931-79af146bd74c?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
] satisfies CarouselSlide[]

const stepsItems = [
  {
    content: "Create your account",
    description: "Create your account",
    title: "Account",
  },
  {
    content: "Complete your profile",
    description: "Complete your profile",
    title: "Profile",
  },
  {
    content: "Configure settings",
    description: "Configure settings",
    title: "Settings",
  },
  {
    content: "Review and confirm",
    description: "Review and confirm",
    title: "Review",
  },
]

const tabsItems = [
  {
    content: <div className="p-200">Overview content.</div>,
    label: "Overview",
    value: "overview",
  },
  {
    content: <div className="p-200">Details content.</div>,
    label: "Details",
    value: "details",
  },
  {
    content: <div className="p-200">Reviews content.</div>,
    label: "Reviews",
    value: "reviews",
  },
]

const treeData: TreeNode[] = [
  {
    children: [
      {
        children: [
          { id: "button.tsx", name: "button.tsx" },
          { id: "input.tsx", name: "input.tsx" },
        ],
        id: "atoms",
        name: "atoms",
      },
      {
        children: [
          { id: "dialog.tsx", name: "dialog.tsx" },
          { id: "select.tsx", name: "select.tsx" },
        ],
        id: "molecules",
        name: "molecules",
      },
    ],
    id: "src",
    name: "src",
  },
  { id: "package.json", name: "package.json" },
]

const tableRows = [
  { category: "Electronics", id: 1, name: "Laptop", price: 999.99, stock: 24 },
  {
    category: "Appliances",
    id: 2,
    name: "Coffee Maker",
    price: 49.99,
    stock: 98,
  },
  { category: "Furniture", id: 3, name: "Desk Chair", price: 150, stock: 16 },
]

const ToastPreview = () => {
  const toaster = useToast()
  return (
    <Button
      size="md"
      onClick={() => {
        toaster.create({
          description: "Changes stored successfully.",
          title: "Saved",
          type: "success",
        })
      }}
    >
      Show Toast
    </Button>
  )
}

const ComponentComparison = () => {
  const [currentStep, setCurrentStep] = useState(1)

  return (
    <div className="min-h-screen bg-base text-fg-primary">
      <div className="mx-auto flex max-w-5xl flex-col gap-700 p-600">
        <header className="flex flex-col gap-100">
          <h1 className="text-xl font-semibold">Component Comparison</h1>
          <p className="text-sm text-fg-secondary">
            Side-by-side snapshots of UI primitives and composites for visual
            consistency checks.
          </p>
        </header>

        <Section
          title="Atoms"
          gridClassName="grid grid-cols-1 gap-300  lg:grid-cols-2 xl:grid-cols-3"
        >
          <ComponentCard title="Badge">
            <Badge variant="primary">New</Badge>
            <Badge variant="secondary">Beta</Badge>
          </ComponentCard>
          <ComponentCard title="Button">
            <Button size="md">Primary</Button>
            <Button size="md" variant="secondary">
              Secondary
            </Button>
          </ComponentCard>
          <ComponentCard
            title="Checkbox"
            bodyClassName="flex items-center gap-200"
          >
            <Checkbox defaultChecked id="audit-checkbox" />
            <Label htmlFor="audit-checkbox" size="md">
              Subscribe
            </Label>
          </ComponentCard>
          <ComponentCard title="Icon">
            <Icon icon="icon-[mdi--check]" size="md" />
          </ComponentCard>
          <ComponentCard
            title="Image"
            bodyClassName="flex items-center gap-200"
          >
            <Image
              alt="Sample"
              className="rounded-md object-cover"
              size="md"
              src="https://images.unsplash.com/photo-1540206395-68808572332f?w=600&h=600&fit=crop"
            />
          </ComponentCard>
          <ComponentCard title="Input" bodyClassName="w-full max-w-xs">
            <Input placeholder="Email address" size="md" />
          </ComponentCard>
          <ComponentCard title="Label">
            <Label required size="md">
              Full name
            </Label>
          </ComponentCard>
          <ComponentCard title="NumericInput" bodyClassName="w-full max-w-xs">
            <NumericInput defaultValue={12} size="md">
              <NumericInput.Control>
                <NumericInput.Input />
                <NumericInput.TriggerContainer>
                  <NumericInput.IncrementTrigger />
                  <NumericInput.DecrementTrigger />
                </NumericInput.TriggerContainer>
              </NumericInput.Control>
            </NumericInput>
          </ComponentCard>
          <ComponentCard title="Rating">
            <Rating defaultValue={4} size="md" />
          </ComponentCard>
          <ComponentCard
            title="Skeleton"
            bodyClassName="flex items-center gap-200"
          >
            <Skeleton.Circle size="md" />
            <Skeleton.Text containerClassName="w-full max-w-xs" noOfLines={2} />
          </ComponentCard>
          <ComponentCard title="StatusText">
            <StatusText showIcon size="md" status="success">
              Saved successfully.
            </StatusText>
          </ComponentCard>
          <ComponentCard title="Textarea" bodyClassName="w-full max-w-xs">
            <Textarea placeholder="Notes..." size="md" />
          </ComponentCard>
          <ComponentCard title="Tooltip">
            <Tooltip content="Tooltip content" size="md">
              <Button size="md" theme="borderless">
                Hover
              </Button>
            </Tooltip>
          </ComponentCard>
        </Section>

        <Section
          title="Inputs"
          description="All box-style form controls side-by-side with their button counterpart at sm and md sizes. Heights should be visually identical."
          gridClassName="grid grid-cols-1 gap-300"
        >
          {comparisonSizes.map((size) => (
            <ComponentCard
              key={size}
              title={`Size: ${size}`}
              bodyClassName="flex flex-wrap items-center gap-50"
            >
              <Input placeholder="Input" size={size} className="w-40" />
              <Button size={size}>Button</Button>
            </ComponentCard>
          ))}
          {comparisonSizes.map((size) => (
            <ComponentCard
              key={`numeric-${size}`}
              title={`NumericInput — ${size}`}
              bodyClassName="flex flex-wrap items-center gap-50"
            >
              <NumericInput defaultValue={1} size={size}>
                <NumericInput.Control>
                  <NumericInput.Input />
                  <NumericInput.TriggerContainer>
                    <NumericInput.IncrementTrigger />
                    <NumericInput.DecrementTrigger />
                  </NumericInput.TriggerContainer>
                </NumericInput.Control>
              </NumericInput>
              <Button size={size}>Button</Button>
            </ComponentCard>
          ))}
          {comparisonSizes.map((size) => (
            <ComponentCard
              key={`combobox-${size}`}
              title={`Combobox — ${size}`}
              bodyClassName="flex flex-wrap items-center gap-50"
            >
              <div className="w-48">
                <Combobox
                  items={comboboxItems}
                  placeholder="Pick fruit"
                  size={size}
                />
              </div>
              <Button size={size}>Button</Button>
            </ComponentCard>
          ))}
          {comparisonSizes.map((size) => (
            <ComponentCard
              key={`select-${size}`}
              title={`Select — ${size}`}
              bodyClassName="flex flex-wrap items-center gap-50"
            >
              <div className="w-48">
                <Select items={selectItems} size={size}>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Choose country" />
                    </Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {selectItems.map((item) => (
                        <Select.Item item={item} key={item.value}>
                          <Select.ItemText />
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select>
              </div>
              <Button size={size}>Button</Button>
            </ComponentCard>
          ))}
          {comparisonSizes.map((size) => (
            <ComponentCard
              key={`textarea-${size}`}
              title={`Textarea — ${size}`}
              bodyClassName="flex flex-wrap items-start gap-50"
            >
              <Textarea placeholder="Notes..." size={size} className="w-56" />
              <Button size={size}>Button</Button>
            </ComponentCard>
          ))}
          {comparisonSizes.map((size) => (
            <ComponentCard
              key={`searchform-${size}`}
              title={`SearchForm — ${size}`}
              bodyClassName="w-full max-w-xs"
            >
              <SearchForm size={size}>
                <SearchForm.Control>
                  <SearchForm.Input placeholder="Search..." />
                  <SearchForm.Button>Search</SearchForm.Button>
                </SearchForm.Control>
              </SearchForm>
            </ComponentCard>
          ))}
          {comparisonSizes.map((size) => (
            <ComponentCard
              key={`searchform-gapped-${size}`}
              title={`SearchForm (gapped) — ${size}`}
              bodyClassName="w-full max-w-xs"
            >
              <SearchForm gapped size={size}>
                <SearchForm.Control>
                  <SearchForm.Input placeholder="Search..." />
                  <SearchForm.Button>Search</SearchForm.Button>
                </SearchForm.Control>
              </SearchForm>
            </ComponentCard>
          ))}
        </Section>

        <Section
          title="Molecules"
          gridClassName="grid grid-cols-1 gap-300 md:grid-cols-2 2xl:grid-cols-3"
        >
          <ComponentCard title="Accordion" bodyClassName="w-full max-w-sm">
            <Accordion defaultValue={["item-1"]} size="md">
              <Accordion.Item value="item-1">
                <Accordion.Header>
                  <Accordion.Title>First</Accordion.Title>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>First panel content.</Accordion.Content>
              </Accordion.Item>
              <Accordion.Item value="item-2">
                <Accordion.Header>
                  <Accordion.Title>Second</Accordion.Title>
                  <Accordion.Indicator />
                </Accordion.Header>
                <Accordion.Content>Second panel content.</Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </ComponentCard>
          <ComponentCard title="Breadcrumb" bodyClassName="w-full">
            <BreadcrumbTemplate items={breadcrumbItems} size="md" />
          </ComponentCard>
          <ComponentCard
            title="Carousel"
            className="md:col-span-2"
            bodyClassName="w-fit"
          >
            <div className="mx-auto w-fit">
              <Carousel
                aspectRatio="landscape"
                className="w-md"
                size="md"
                slideCount={carouselSlides.length}
              >
                <Carousel.Slides className="w-md" slides={carouselSlides} />
                <Carousel.Control
                  className="w-full justify-between"
                  controlPosition="unset"
                >
                  <Carousel.Previous />
                  <Carousel.Indicators />
                  <Carousel.Next />
                </Carousel.Control>
              </Carousel>
            </div>
          </ComponentCard>
          <ComponentCard title="ColorSelect">
            <ColorSelect colors={colorOptions} layout="grid" size="md" />
          </ComponentCard>
          <ComponentCard title="Combobox" bodyClassName="w-full max-w-xs">
            <Combobox
              defaultValue={["banana"]}
              items={comboboxItems}
              label="Fruit"
              placeholder="Pick a fruit"
              size="md"
            />
          </ComponentCard>
          <ComponentCard title="Dialog">
            <Dialog
              actions={<Button size="md">Done</Button>}
              description="Short dialog description."
              size="md"
              title="Dialog title"
              triggerText="Open dialog"
            >
              <p className="text-sm text-fg-secondary">
                Dialog body content goes here.
              </p>
            </Dialog>
          </ComponentCard>
          <ComponentCard title="FormCheckbox">
            <FormCheckbox label="Accept terms" size="md" />
          </ComponentCard>
          <ComponentCard title="FormInput" bodyClassName="w-full max-w-xs">
            <FormInput
              id="audit-form-input"
              label="Email"
              placeholder="name@domain.com"
              size="md"
            />
          </ComponentCard>
          <ComponentCard
            title="FormNumericInput"
            bodyClassName="w-full max-w-xs"
          >
            <FormNumericInput
              defaultValue={2}
              id="audit-form-numeric"
              label="Quantity"
              size="md"
            >
              <NumericInput.Control>
                <NumericInput.Input />
                <NumericInput.TriggerContainer>
                  <NumericInput.IncrementTrigger />
                  <NumericInput.DecrementTrigger />
                </NumericInput.TriggerContainer>
              </NumericInput.Control>
            </FormNumericInput>
          </ComponentCard>
          <ComponentCard title="FormTextarea" bodyClassName="w-full max-w-xs">
            <FormTextarea
              id="audit-form-textarea"
              label="Message"
              placeholder="Write a short note..."
              size="md"
            />
          </ComponentCard>
          <ComponentCard title="Menu">
            <Menu items={menuItems} size="md" triggerText="Actions" />
          </ComponentCard>
          <ComponentCard
            title="Pagination"
            bodyClassName="w-full overflow-x-auto"
          >
            <Pagination
              compact
              count={12}
              getPageUrl={({ page, pageSize }) =>
                `#component-pagination?page=${page}&pageSize=${pageSize}`
              }
              pageSize={1}
              size="md"
            />
          </ComponentCard>
          <ComponentCard title="Popover">
            <Popover.Root id="popover" size="md">
              <Popover.Trigger>Details</Popover.Trigger>
              <Popover.Positioner>
                <Popover.Content>
                  <Popover.Arrow />
                  <Popover.Title>Popover</Popover.Title>
                  <Popover.Description>
                    Quick details about the item.
                  </Popover.Description>
                  <div className="text-sm text-fg-secondary">
                    Popover content.
                  </div>
                </Popover.Content>
              </Popover.Positioner>
            </Popover.Root>
          </ComponentCard>
          <ComponentCard
            title="ProductCard"
            bodyClassName="flex w-full justify-center"
          >
            <div className="w-full max-w-sm">
              <ProductCard layout="column">
                <ProductCard.Image
                  as="img"
                  alt="Sample product"
                  src="https://images.unsplash.com/photo-1540206395-68808572332f?w=600&h=600&fit=crop"
                  className="w-full"
                />
                <ProductCard.Badges>
                  <Badge variant="secondary">Limited</Badge>
                  <Badge variant="info">New</Badge>
                </ProductCard.Badges>
                <ProductCard.Name>Canvas Backpack</ProductCard.Name>
                <ProductCard.Price>$79.00</ProductCard.Price>
                <ProductCard.Rating rating={{ defaultValue: 4, size: "md" }} />
                <ProductCard.Stock status="limited-stock">
                  Limited stock
                </ProductCard.Stock>
                <ProductCard.Actions>
                  <ProductCard.Button
                    buttonVariant="cart"
                    icon="token-icon-cart-button"
                  >
                    Add to cart
                  </ProductCard.Button>
                </ProductCard.Actions>
              </ProductCard>
            </div>
          </ComponentCard>
          <ComponentCard title="SearchForm" bodyClassName="w-full max-w-sm">
            <SearchForm defaultValue="Query" size="md">
              <SearchForm.Label>Search</SearchForm.Label>
              <SearchForm.Control>
                <SearchForm.Input placeholder="Search..." />
                <SearchForm.ClearButton />
                <SearchForm.Button showSearchIcon>Go</SearchForm.Button>
              </SearchForm.Control>
            </SearchForm>
          </ComponentCard>
          <ComponentCard title="Select" bodyClassName="w-full max-w-xs">
            <Select defaultValue={["us"]} items={selectItems} size="md">
              <Select.Label>Country</Select.Label>
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Choose a country" />
                </Select.Trigger>
                <Select.ClearTrigger />
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {selectItems.map((item) => (
                    <Select.Item item={item} key={item.value}>
                      <Select.ItemText />
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
              <Select.StatusText>Helper text</Select.StatusText>
            </Select>
          </ComponentCard>
          <ComponentCard title="Slider" bodyClassName="w-full">
            <div className="w-full max-w-sm">
              <Slider
                defaultValue={[35]}
                id="audit-slider"
                label="Volume"
                showValueText
                size="md"
              />
            </div>
          </ComponentCard>
          <ComponentCard
            title="Steps"
            className="md:col-span-2 2xl:col-span-3"
            bodyClassName="w-full"
          >
            <div className="w-full max-w-xl">
              <Steps
                count={stepsItems.length}
                onStepChange={(details) => {
                  setCurrentStep(details.step)
                }}
                size="md"
                step={currentStep}
                variant="subtle"
              >
                <Steps.List>
                  {stepsItems.map((item, index) => (
                    <Steps.Item index={index} key={item.title}>
                      <Steps.Trigger>
                        <Steps.Indicator />
                        <Steps.ItemText>
                          <Steps.Title>{item.title}</Steps.Title>
                        </Steps.ItemText>
                      </Steps.Trigger>
                      <Steps.Separator />
                    </Steps.Item>
                  ))}
                </Steps.List>
                <Steps.Panels>
                  {stepsItems.map((item, index) => (
                    <Steps.Content index={index} key={item.title}>
                      <p className="text-sm text-fg-secondary">
                        {item.content}
                      </p>
                    </Steps.Content>
                  ))}
                  <Steps.CompletedContent>
                    <p className="text-sm text-fg-secondary">
                      All steps complete.
                    </p>
                  </Steps.CompletedContent>
                  <Steps.Navigation>
                    <Steps.PrevTrigger>Back</Steps.PrevTrigger>
                    <Steps.NextTrigger>Continue</Steps.NextTrigger>
                  </Steps.Navigation>
                </Steps.Panels>
              </Steps>
            </div>
          </ComponentCard>
          <ComponentCard title="Switch">
            <Switch defaultChecked>Notifications</Switch>
          </ComponentCard>
          <ComponentCard
            title="Tabs"
            className="md:col-span-2"
            bodyClassName="w-full"
          >
            <div className="w-full max-w-md">
              <Tabs defaultValue="overview" size="md" variant="line" fitted>
                <Tabs.List>
                  {tabsItems.map((tab) => (
                    <Tabs.Trigger key={tab.value} value={tab.value}>
                      {tab.label}
                    </Tabs.Trigger>
                  ))}
                  <Tabs.Indicator />
                </Tabs.List>
                {tabsItems.map((tab) => (
                  <Tabs.Content key={tab.value} value={tab.value}>
                    {tab.content}
                  </Tabs.Content>
                ))}
              </Tabs>
            </div>
          </ComponentCard>
          <ComponentCard title="Toast">
            <ToastPreview />
          </ComponentCard>
          <ComponentCard title="TreeView" bodyClassName="w-full">
            <TreeView
              className="w-full max-w-sm p-200"
              data={treeData}
              size="md"
            >
              <TreeView.Label>Project Files</TreeView.Label>
              <TreeView.Tree>
                {treeData.map((node, index) => (
                  <TreeView.Node
                    indexPath={[index]}
                    key={node.id}
                    node={node}
                  />
                ))}
              </TreeView.Tree>
            </TreeView>
          </ComponentCard>
        </Section>

        <Section title="Organisms" gridClassName="grid grid-cols-1 gap-300">
          <ComponentCard title="Header" bodyClassName="w-full">
            <div className="mx-auto w-full max-w-5xl">
              <Header>
                <Header.Nav>
                  <Header.NavItem active>
                    <Link href="#">Home</Link>
                  </Header.NavItem>
                  <Header.NavItem>
                    <Link href="#">Docs</Link>
                  </Header.NavItem>
                  <Header.NavItem>
                    <Link href="#">Pricing</Link>
                  </Header.NavItem>
                </Header.Nav>
                <Header.Actions>
                  <Header.ActionItem>
                    <Button size="md" theme="unstyled">
                      Sign in
                    </Button>
                  </Header.ActionItem>
                </Header.Actions>
              </Header>
            </div>
          </ComponentCard>
          <ComponentCard title="Footer" bodyClassName="w-full">
            <div className="mx-auto w-full max-w-5xl">
              <Footer>
                <Footer.Container>
                  <Footer.Section>
                    <Footer.Title>Company</Footer.Title>
                    <Footer.Link href="#">About</Footer.Link>
                    <Footer.Link href="#">Team</Footer.Link>
                  </Footer.Section>
                  <Footer.Section>
                    <Footer.Title>Resources</Footer.Title>
                    <Footer.Link href="#">Docs</Footer.Link>
                    <Footer.Link href="#">Support</Footer.Link>
                  </Footer.Section>
                  <Footer.Section>
                    <Footer.Title>Legal</Footer.Title>
                    <Footer.Link href="#">Privacy</Footer.Link>
                    <Footer.Text>2026 Company</Footer.Text>
                  </Footer.Section>
                </Footer.Container>
              </Footer>
            </div>
          </ComponentCard>
          <ComponentCard title="Table" bodyClassName="w-full">
            <div className="w-full overflow-x-auto">
              <Table variant="line">
                <Table.Caption>Product Inventory</Table.Caption>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Product</Table.ColumnHeader>
                    <Table.ColumnHeader>Category</Table.ColumnHeader>
                    <Table.ColumnHeader numeric>Price</Table.ColumnHeader>
                    <Table.ColumnHeader numeric>Stock</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {tableRows.map((row) => (
                    <Table.Row key={row.id}>
                      <Table.Cell>{row.name}</Table.Cell>
                      <Table.Cell>{row.category}</Table.Cell>
                      <Table.Cell numeric>${row.price.toFixed(2)}</Table.Cell>
                      <Table.Cell numeric>{row.stock}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </ComponentCard>
        </Section>
      </div>
      <Toaster />
    </div>
  )
}

export const SideBySide: Story = {
  render: () => <ComponentComparison />,
}
