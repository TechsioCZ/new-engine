import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { StatusText } from "../../src/atoms/status-text"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { Tabs } from "../../src/molecules/tabs"
import { Accordion } from "../../src/molecules/accordion"
import { Breadcrumb } from "../../src/molecules/breadcrumb"
import { Button } from "../../src/atoms/button"
import { AccordionTemplate } from "../../src/templates/accordion"
import { BreadcrumbTemplate } from "../../src/templates/breadcrumb"
import { TabsTemplate } from "../../src/templates/tabs"
import { Pagination } from "../../src/molecules/pagination"
import { Steps, useSteps } from "../../src/molecules/steps"
import { TreeView, type TreeNode } from "../../src/molecules/tree-view"

const meta: Meta = {
  title: "Verification/NavigationDisclosure",
  tags: ["autodocs", "ui-semantic-regression"],
  parameters: {
    controls: { disable: true },
    layout: "padded",
    docs: { description: { component: "Interaction regressions for dynamic navigation, bounded pages and independent tree disclosure. These examples retain local data and never navigate away." } },
  },
}
export default meta
type Story = StoryObj

function TabsRecoveryExample() {
  const [items, setItems] = useState<string[]>([])
  const [disabled, setDisabled] = useState(false)
  const [controlled, setControlled] = useState(false)
  const [requests, setRequests] = useState(0)
  const [accept, setAccept] = useState(false)
  const [controlledValue, setControlledValue] = useState("missing")
  const [manual, setManual] = useState(false)
  return (
    <div className="flex min-w-0 flex-col gap-200">
      <div className="flex flex-wrap gap-100">
        <Button onClick={() => setItems(["Alpha", "Beta", "Gamma"])}>Load tabs</Button>
        <Button onClick={() => setDisabled(!disabled)}>Toggle Alpha availability</Button>
        <Button onClick={() => setControlled(!controlled)}>Toggle rejected controlled value</Button>
        <Button onClick={() => { setAccept(true); setControlledValue("unknown"); setControlled(true) }}>Accept recovery</Button>
        <Button onClick={() => setManual(!manual)}>Toggle manual activation</Button>
      </div>
      <StatusText role="status">Recovery requests: {requests}</StatusText>
      <TabsTemplate
        variant="line"
        showIndicator
        tablistProps={{ "aria-labelledby": "dynamic-tabs-heading", onKeyDown: () => {} }}
        activationMode={manual ? "manual" : "automatic"}
        value={controlled ? controlledValue : undefined}
        onValueChange={(next) => { setRequests((count) => count + 1); if (accept) setControlledValue(next) }}
        onKeyDownCapture={(event) => {
          if (event.key === "Delete") {
            const selected = (event.target as HTMLElement).textContent
            setItems((values) => values.filter((value) => value !== selected))
          }
        }}
        items={items.map((value) => ({ value, label: value, disabled: value === "Alpha" && disabled, content: <Label>{value} notes<Input defaultValue="Retained note" /></Label> }))}
      />
      <h2 id="dynamic-tabs-heading">Dynamic product views</h2>
      <Button>After tabs</Button>
    </div>
  )
}

export const TabsRecovery: Story = {
  parameters: { docs: { description: { story: "Async population, focused deletion, disabled selection and rejected controlled recovery preserve an enabled keyboard entry without remounting panels." } } },
  render: () => <TabsRecoveryExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Load tabs" }))
    const alpha = canvas.getByRole("tab", { name: "Alpha" })
    await waitFor(() => expect(alpha).toHaveAttribute("aria-selected", "true"))
    alpha.focus()
    await userEvent.keyboard("{ArrowRight}")
    const beta = canvas.getByRole("tab", { name: "Beta" })
    await waitFor(() => expect(beta).toHaveFocus())
    await userEvent.keyboard("{Delete}")
    const gamma = canvas.getByRole("tab", { name: "Gamma" })
    await waitFor(() => { expect(gamma).toHaveFocus(); expect(gamma).toHaveAttribute("aria-selected", "true") })
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(alpha).toHaveFocus())
    await userEvent.click(canvas.getByRole("button", { name: "Toggle Alpha availability" }))
    await waitFor(() => expect(gamma).toHaveAttribute("aria-selected", "true"))
    await expect(canvas.getByRole("button", { name: "Toggle Alpha availability" })).toHaveFocus()
    await userEvent.click(canvas.getByRole("button", { name: "Toggle rejected controlled value" }))
    await waitFor(() => expect(gamma).toHaveAttribute("tabindex", "0"))
    await expect(gamma).toHaveAttribute("aria-selected", "false")
    const rejectedCount = canvas.getByRole("status").textContent
    await new Promise((resolve) => setTimeout(resolve, 100))
    await expect(canvas.getByRole("status")).toHaveTextContent(rejectedCount ?? "")
    await userEvent.click(canvas.getByRole("button", { name: "Accept recovery" }))
    await waitFor(() => expect(gamma).toHaveAttribute("aria-selected", "true"))
    await userEvent.click(canvas.getByRole("button", { name: "Toggle Alpha availability" }))
    await userEvent.click(canvas.getByRole("button", { name: "Toggle manual activation" }))
    gamma.focus()
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(alpha).toHaveFocus())
    await expect(gamma).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(alpha).toHaveAttribute("aria-selected", "true"))
    canvasElement.dataset.navRegression = "passed"
  },
}

const selectionChange = fn()
const treeData: TreeNode[] = [
  { id: "src", name: "src", children: [
    { id: "nested", name: "nested", children: [{ id: "deep", name: "deep", children: [{ id: "level4", name: "level4", children: [{ id: "file", name: "file.ts" }] }] }] },
    { id: "disabled", name: "disabled", disabled: true },
  ] },
  { id: "readme", name: "README.md", selectable: false },
  { id: "package", name: "package.json" },
]
function TreeRecoveryExample() {
  const [data, setData] = useState(treeData)
  const [behavior, setBehavior] = useState<"all" | "leaf-only" | "custom">("leaf-only")
  const [selected, setSelected] = useState<string[]>([])
  const [cancel, setCancel] = useState(false)
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr")
  return (
    <div className="flex min-w-0 flex-col gap-200">
      <div className="flex flex-wrap gap-100">
        <Button onClick={() => setBehavior("custom")}>Use custom selection</Button>
        <Button onClick={() => setBehavior("all")}>Allow every enabled node</Button>
        <Button onClick={() => setCancel(!cancel)}>Toggle click cancellation</Button>
        <Button onClick={() => setDir(dir === "ltr" ? "rtl" : "ltr")}>Toggle tree direction</Button>
      </div>
      <StatusText role="status">Selected: {selected.join(", ") || "none"}</StatusText>
      <TreeView data={data} dir={dir} selectionMode="multiple" selectionBehavior={behavior} defaultExpandedValue={["src", "nested", "deep", "level4"]} onSelectionChange={(details) => { selectionChange(details); setSelected(details.selectedValue) }} onKeyDownCapture={(event) => { if (event.key === "Delete") setData((values) => values.filter((node) => node.id !== (event.target as HTMLElement).dataset.value)) }}>
        <TreeView.Label>Source files</TreeView.Label>
        <TreeView.Tree onKeyDown={() => {}}>
          {data.map((node, index) => node.children ? <TreeView.Node key={node.id} node={node} indexPath={[index]} /> : <TreeView.NodeProvider key={node.id} node={node} indexPath={[index]}><TreeView.Item onClick={(event) => { if (cancel) event.preventDefault() }}><TreeView.ItemText /></TreeView.Item></TreeView.NodeProvider>)}
        </TreeView.Tree>
      </TreeView>
      <Button>After tree</Button>
    </div>
  )
}
export const TreeRecovery: Story = {
  parameters: { docs: { description: { story: "Selection restrictions apply to select-all and clicks without disabling disclosure; ancestor collapse recovers focus and per-level indentation stays constant." } } },
  render: () => <TreeRecoveryExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const branch = canvas.getByRole("button", { name: "src" })
    branch.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await waitFor(() => expect(canvas.getByRole("button", { name: "Expand src" })).toHaveAttribute("aria-expanded", "false"))
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(canvas.getByRole("button", { name: "Collapse src" })).toHaveAttribute("aria-expanded", "true"))
    await expect(canvas.getByRole("status")).toHaveTextContent("Selected: none")
    await userEvent.keyboard("{ArrowRight}")
    await waitFor(() => expect(canvas.getByRole("button", { name: "nested" })).toHaveFocus())
    const leaf = canvas.getByRole("treeitem", { name: "file.ts" })
    leaf.focus()
    await userEvent.click(canvas.getByRole("button", { name: "Collapse src" }))
    await waitFor(() => expect(branch).toHaveFocus())
    await userEvent.keyboard("{Control>}a{/Control}")
    await expect(canvas.getByRole("status")).not.toHaveTextContent("src,")
    await expect(canvas.getByRole("status")).not.toHaveTextContent("disabled")
    await userEvent.click(canvas.getByRole("button", { name: "Use custom selection" }))
    branch.focus()
    await userEvent.keyboard("{Meta>}a{/Meta}")
    await expect(canvas.getByRole("status")).not.toHaveTextContent("readme")
    await userEvent.click(canvas.getByRole("button", { name: "Toggle click cancellation" }))
    const before = canvas.getByRole("status").textContent
    await userEvent.click(canvas.getByRole("treeitem", { name: "package.json" }))
    await expect(canvas.getByRole("status")).toHaveTextContent(before ?? "")
    canvasElement.dataset.navRegression = "passed"
  },
}

function PaginationRecoveryExample() {
  const [count, setCount] = useState(100)
  const [reject, setReject] = useState(false)
  const [changes, setChanges] = useState(0)
  return <div className="flex min-w-0 flex-col gap-200">
    <div className="flex flex-wrap gap-100"><Button onClick={() => setCount(20)}>Reduce results</Button><Button onClick={() => setCount(0)}>Clear results</Button><Button onClick={() => setReject(!reject)}>Toggle invalid controlled page</Button></div>
    <StatusText role="status">Page changes: {changes}</StatusText>
    <Pagination count={count} defaultPage={10} page={reject ? 10 : undefined} getPageUrl={({ page }) => `#page-${page}`} onPageChange={() => setChanges((value) => value + 1)} onClick={(event) => event.preventDefault()} variant="minimal" />
    <Pagination count={0} compact getPageUrl={({ page }) => `#empty-${page}`} />
    <Pagination count={100} defaultPage={5} dir="rtl" compact getPageUrl={({ page }) => `#rtl-${page}`} onClick={(event) => event.preventDefault()} />
  </div>
}
export const PaginationRecovery: Story = {
  parameters: { docs: { description: { story: "Count changes reconcile uncontrolled state, invalid controlled owners cannot expose bad URLs, empty ranges are meaningful and modified links preserve original state." } } },
  render: () => <PaginationRecoveryExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = within(canvas.getAllByRole("navigation")[0]!)
    await userEvent.click(canvas.getByRole("button", { name: "Reduce results" }))
    await waitFor(() => expect(first.getByRole("link", { current: "page" })).toHaveTextContent("2"))
    await expect(first.getByRole("link", { name: /next/i })).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(canvas.getByRole("button", { name: "Clear results" }))
    await waitFor(() => expect(first.queryAllByRole("link").every((link) => !link.hasAttribute("href"))).toBe(true))
    await expect(canvas.getByText("0 of 0")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Toggle invalid controlled page" }))
    await expect(first.getByRole("status")).toHaveTextContent("Page unavailable")
    canvasElement.dataset.navRegression = "passed"
  },
}

function StoreStepsExample() {
  const [count, setCount] = useState(3)
  const api = useSteps({ count, defaultStep: 2 })
  const stages = ["Stage 1", "Stage 2", "Stage 3"].slice(0, count)
  return <section><Button onClick={() => setCount(1)}>Remove final steps</Button><Steps.RootProvider value={api}><Steps.Progress /><Steps.List>{stages.map((stage, index) => <Steps.Item key={stage} index={index}><Steps.Trigger><Steps.Title>{stage}</Steps.Title></Steps.Trigger></Steps.Item>)}</Steps.List>{stages.map((stage, index) => <Steps.Content key={stage} index={index}>{stage} content</Steps.Content>)}<Steps.CompletedContent aria-label="Store complete">Ready for handoff.</Steps.CompletedContent><Steps.NextTrigger>Finish stage</Steps.NextTrigger></Steps.RootProvider></section>
}
const invalidStep = fn()
export const StepsRecovery: Story = {
  parameters: { docs: { description: { story: "Direct validation matches the shared hook; shrinking an unfinished store recovers a real stage and completion has a valid name and focus target." } } },
  render: () => <div className="flex flex-col gap-300"><Steps count={3} linear isStepValid={() => false} onStepInvalid={invalidStep} ids={{ root: "validation-root" }}><Steps.List><Steps.Item index={0}><Steps.Trigger><Steps.Title>Brief</Steps.Title></Steps.Trigger></Steps.Item></Steps.List><Steps.Content index={0}>Correct the brief before continuing.</Steps.Content><Steps.NextTrigger>Validate brief</Steps.NextTrigger></Steps><StoreStepsExample /></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    invalidStep.mockClear()
    await userEvent.click(canvas.getByRole("button", { name: "Validate brief" }))
    await expect(invalidStep).toHaveBeenCalledWith(expect.objectContaining({ step: 0, action: "next" }))
    await expect(canvas.getByText("Correct the brief before continuing.")).toBeVisible()
    await expect(canvasElement.querySelector("#validation-root")).not.toHaveAttribute("isStepValid")
    await userEvent.click(canvas.getByRole("button", { name: "Remove final steps" }))
    await waitFor(() => expect(canvas.getByRole("region", { name: "Stage 1" })).toBeVisible())
    await expect(canvas.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
    await userEvent.click(canvas.getByRole("button", { name: "Finish stage" }))
    await waitFor(() => expect(canvas.getByRole("region", { name: "Store complete" })).toHaveFocus())
    canvasElement.dataset.navRegression = "passed"
  },
}

const longCode = "HydraulikschlauchverschraubungsSicherheitsanschlussproduktcode1234567890"
export const LongLabels: Story = {
  parameters: { docs: { description: { story: "Full unbroken product labels wrap in both shared primitives and templates without shrinking disclosure indicators or changing breadcrumb typography." } } },
  render: () => <div className="flex min-w-0 max-w-full flex-col gap-300"><BreadcrumbTemplate items={[{ label: longCode, href: "#products", icon: "token-icon-home" }, { label: longCode }]} />
    <Breadcrumb aria-label="Compound location"><Breadcrumb.List><Breadcrumb.Item><Breadcrumb.Link href="#home"><Breadcrumb.Icon icon="token-icon-home" /><span>{longCode}</span></Breadcrumb.Link></Breadcrumb.Item><Breadcrumb.Separator /><Breadcrumb.Item><Breadcrumb.CurrentLink>{longCode}</Breadcrumb.CurrentLink></Breadcrumb.Item></Breadcrumb.List></Breadcrumb>
    <Accordion><Accordion.Item value="long"><Accordion.Header><Accordion.Title>{longCode}<Accordion.Subtitle>Localized product reference</Accordion.Subtitle></Accordion.Title><Accordion.Indicator /></Accordion.Header><Accordion.Content>Full specifications</Accordion.Content></Accordion.Item></Accordion><AccordionTemplate headingLevel={2} items={[{ value: "code", title: longCode, content: "Complete product documentation remains available." }]} /><h2 id="first-views">Product details</h2><TabsTemplate items={[{ value: "spec", label: "Specifications", content: "Dimensions" }, { value: "stock", label: "Availability", content: "In stock" }]} tablistProps={{ "aria-labelledby": "first-views" }} /><h2 id="second-views">Delivery options</h2><TabsTemplate items={[{ value: "standard", label: "Standard", content: "Two working days" }, { value: "express", label: "Express", content: "Next working day" }]} tablistProps={{ "aria-labelledby": "second-views" }} /></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 2, name: longCode })).toBeVisible()
    await expect(canvas.getByRole("tablist", { name: "Product details" })).toBeVisible()
    await expect(canvas.getByRole("tablist", { name: "Delivery options" })).toBeVisible()
    const viewport = canvasElement.ownerDocument.documentElement.clientWidth
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(viewport)
    canvasElement.dataset.navRegression = "passed"
  },
}

export const HandlerComposition: Story = {
  parameters: { docs: { description: { story: "Non-cancelling consumer handlers coexist with the machine; preventDefault deliberately cancels keyboard navigation and selection." } } },
  render: () => {
    const [cancel, setCancel] = useState(false)
    return <div className="flex flex-col gap-200"><Button onClick={() => setCancel(!cancel)}>Toggle handler cancellation</Button><Tabs defaultValue="overview"><Tabs.List aria-label="Documented example" onKeyDown={(event) => { if (cancel) event.preventDefault() }}><Tabs.Trigger value="overview">Overview</Tabs.Trigger><Tabs.Trigger value="delivery" onClick={(event) => { if (cancel) event.preventDefault() }}>Delivery</Tabs.Trigger></Tabs.List><Tabs.Content value="overview">Product specifications.</Tabs.Content><Tabs.Content value="delivery">Dispatch within two working days.</Tabs.Content></Tabs></div>
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const overview = canvas.getByRole("tab", { name: "Overview" })
    const delivery = canvas.getByRole("tab", { name: "Delivery" })
    overview.focus()
    await userEvent.keyboard("{End}")
    await waitFor(() => { expect(delivery).toHaveFocus(); expect(delivery).toHaveAttribute("aria-selected", "true") })
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(overview).toHaveAttribute("aria-selected", "true"))
    await userEvent.click(canvas.getByRole("button", { name: "Toggle handler cancellation" }))
    overview.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(overview).toHaveFocus()
    // Click without changing focus first: automatic activation is intentionally
    // focus-driven, so click cancellation is tested in manual mode separately.
    canvasElement.dataset.navRegression = "passed"
  },
}

const pageChange = fn()
export const LinkActivation: Story = {
  parameters: { docs: { description: { story: "Ordinary primary and Enter activation synchronize pagination; modifiers, auxiliary clicks and explicit new contexts preserve the original page." } } },
  render: () => <div className="flex flex-col gap-300"><Pagination aria-label="Current context pages" count={50} defaultPage={2} getPageUrl={({ page }) => `#current-${page}`} onPageChange={pageChange} onClick={(event) => event.preventDefault()} /><Pagination aria-label="New context pages" count={50} defaultPage={2} linkProps={{ target: "_blank" }} getPageUrl={({ page }) => `#new-${page}`} onPageChange={pageChange} onClick={(event) => event.preventDefault()} /></div>,
  play: async ({ canvasElement }) => {
    const user = userEvent.setup()
    const canvas = within(canvasElement)
    const current = within(canvas.getByRole("navigation", { name: "Current context pages" }))
    const another = within(canvas.getByRole("navigation", { name: "New context pages" }))
    pageChange.mockClear()
    const third = current.getByRole("link", { name: "page 3" })
    for (const modifier of ["Meta", "Control", "Shift", "Alt"]) {
      await user.keyboard(`{${modifier}>}`)
      await user.click(third)
      await user.keyboard(`{/${modifier}}`)
    }
    await expect(pageChange).not.toHaveBeenCalled()
    await expect(current.getByRole("link", { current: "page" })).toHaveTextContent("2")
    await user.click(another.getByRole("link", { name: "page 3" }))
    await expect(pageChange).not.toHaveBeenCalled()
    await user.click(third)
    await waitFor(() => expect(current.getByRole("link", { current: "page" })).toHaveTextContent("3"))
    current.getByRole("link", { name: "page 4" }).focus()
    await user.keyboard("{Enter}")
    await waitFor(() => expect(current.getByRole("link", { current: "page" })).toHaveTextContent("4"))
    await expect(pageChange).toHaveBeenCalledTimes(2)
    canvasElement.dataset.navRegression = "passed"
  },
}

function DisabledSubtreeExample() {
  const [disabled, setDisabled] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const data: TreeNode[] = [
    { id: "source", name: "Source", children: [
      { id: "utilities", name: "Utilities", disabled, children: [
        { id: "helper", name: "helpers.ts" },
        { id: "nested-tools", name: "Nested tools", children: [{ id: "constant", name: "constants.ts" }] },
      ] },
    ] },
    { id: "readme", name: "README.md" },
  ]
  return <div className="flex min-w-0 flex-col gap-200">
    <Button onClick={() => setDisabled(!disabled)}>Toggle utilities availability</Button>
    <StatusText role="status">Selected: {selected.join(", ") || "none"}</StatusText>
    <TreeView data={data} selectionMode="multiple" expandedValue={["source", "utilities", "nested-tools"]} defaultFocusedValue="helper" defaultSelectedValue={["helper"]} onSelectionChange={({ selectedValue }) => setSelected(selectedValue)} onKeyDownCapture={(event) => { if (event.key === "Delete") setDisabled(true) }}>
      <TreeView.Label>Subtree availability</TreeView.Label>
      <TreeView.Tree>{data.map((node, index) => <TreeView.Node key={node.id} node={node} indexPath={[index]} />)}</TreeView.Tree>
    </TreeView>
  </div>
}

export const DisabledSubtree: Story = {
  parameters: { docs: { description: { story: "Controlled expansion cannot make disabled descendants selectable or focusable; disabling an owned subtree restores focus and clears selection." } } },
  render: () => <DisabledSubtreeExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const helper = canvas.getByRole("treeitem", { name: "helpers.ts" })
    const constant = canvas.getByRole("treeitem", { name: "constants.ts" })
    const source = canvas.getByRole("button", { name: "Source" })
    for (const leaf of [helper, constant]) {
      await expect(leaf).toHaveAttribute("aria-disabled", "true")
      await expect(leaf).toHaveAttribute("tabindex", "-1")
      await expect(leaf).not.toHaveAttribute("data-selected")
    }
    source.focus()
    await userEvent.keyboard("{Meta>}a{/Meta}")
    await expect(canvas.getByRole("status")).not.toHaveTextContent(/helper|constant|utilities|nested-tools/)
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(canvas.getByRole("treeitem", { name: "README.md" })).toHaveFocus())
    await userEvent.click(canvas.getByRole("button", { name: "Toggle utilities availability" }))
    helper.focus()
    await userEvent.keyboard(" ")
    await waitFor(() => expect(helper).toHaveAttribute("aria-selected", "true"))
    await userEvent.keyboard("{Delete}")
    await waitFor(() => expect(source).toHaveFocus())
    await expect(helper).toHaveAttribute("aria-disabled", "true")
    await expect(helper).toHaveAttribute("tabindex", "-1")
    await expect(canvas.getByRole("status")).not.toHaveTextContent("helper")
    canvasElement.dataset.navRegression = "passed"
  },
}

export const VerticalTabsLayout: Story = {
  parameters: { docs: { description: { story: "The vertical strip retains readable hit areas while long panel text wraps into the remaining width, including narrow viewports." } } },
  render: () => <Tabs defaultValue="overview" orientation="vertical" variant="line">
    <Tabs.List aria-label="Workspace settings">
      <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
      <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
      <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
      <Tabs.Indicator />
    </Tabs.List>
    <Tabs.Content value="overview">{longCode}</Tabs.Content>
    <Tabs.Content value="analytics">Usage and performance.</Tabs.Content>
    <Tabs.Content value="settings">Workspace preferences.</Tabs.Content>
  </Tabs>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const overview = canvas.getByRole("tab", { name: "Overview" })
    const range = canvasElement.ownerDocument.createRange()
    range.selectNodeContents(overview)
    const text = range.getBoundingClientRect()
    const hitArea = overview.getBoundingClientRect()
    await expect(text.left).toBeGreaterThanOrEqual(hitArea.left)
    await expect(text.right).toBeLessThanOrEqual(hitArea.right)
    const document = canvasElement.ownerDocument.documentElement
    await expect(document.scrollWidth).toBeLessThanOrEqual(document.clientWidth)
    overview.focus()
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(canvas.getByRole("tab", { name: "Analytics" })).toHaveFocus())
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(overview).toHaveFocus())
    canvasElement.dataset.navRegression = "passed"
  },
}
