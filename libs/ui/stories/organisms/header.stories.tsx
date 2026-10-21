import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { Link } from "../../src/atoms/link"
import { Header } from "../../src/organisms/header"

function Navigation({ label }: { label: string }) {
  return (
    <Header.Nav aria-label={label}>
      <Header.NavItem active><Link size="current" aria-current="page" href="/catalog">Catalog</Link></Header.NavItem>
      <Header.NavItem><Link size="current" href="/services">Services</Link></Header.NavItem>
      <Header.NavItem><Link size="current" href="/contact">Contact</Link></Header.NavItem>
    </Header.Nav>
  )
}
function StoreHeader(props: React.ComponentProps<typeof Header>) {
  return (
    <Header {...props} className="items-center gap-200 p-200">
      <Link href="/" className="shrink-0 font-semibold">Workshop</Link>
      <Header.Desktop>
        <Navigation label="Main navigation" />
        <Header.Actions>
          <Header.ActionItem><Button theme="outlined" size={props.size}>Account</Button></Header.ActionItem>
        </Header.Actions>
      </Header.Desktop>
      <Header.Hamburger />
      <Header.Mobile>
        <Navigation label="Mobile navigation" />
      </Header.Mobile>
    </Header>
  )
}
const meta = {
  title: "Organisms/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode"] },
    layout: "fullscreen",
    docs: { description: { component: "Header composes a site's identity, primary navigation and account actions. Its desktop/mobile slots respond to the header's own width at 48rem, including inside narrow layouts; use Sidebar and VerticalNavigation for an application's persistent navigation instead." } },
  },
  decorators: [(Story) => <div onClickCapture={(event) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) event.preventDefault()
  }}><Story /></div>],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    children: { control: false, table: { disable: true } },
    direction: { control: false },
    ref: { control: false, table: { disable: true } },
  },
  args: { size: "md", children: null },
  render: (args) => <StoreHeader {...args} />,
} satisfies Meta<typeof Header>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: { docs: { description: { story: "Resize the viewport or change the size control to try a responsive storefront header without leaving the demo." } } },
}
export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: { description: { story: "Compare Small (sm), Medium (md) and Large (lg) using the same navigation and account action." } },
  },
  render: (args) => <div className="flex flex-col gap-400">
    {(["sm", "md", "lg"] as const).map((size) => <section key={size}>
      <h2 className="p-200">{{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]}</h2>
      <StoreHeader {...args} size={size} />
    </section>)}
  </div>,
}
export const NarrowContainer: Story = {
  parameters: { docs: { description: { story: "A narrow container uses the mobile menu even on desktop, with Escape closing the panel and returning focus to its trigger." } } },
  render: (args) => <div className="w-full max-w-sm"><StoreHeader {...args} /></div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Toggle mobile menu" })
    await userEvent.click(trigger)
    const id = trigger.getAttribute("aria-controls")
    await expect(id).toBeTruthy()
    await expect(canvasElement.ownerDocument.getElementById(id!)).toBeVisible()
    const navigation = canvas.getByRole("navigation", { name: "Mobile navigation" })
    within(navigation).getAllByRole("link")[0]?.focus()
    await userEvent.keyboard("{Escape}")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(navigation).not.toBeVisible()
    await expect(trigger).toHaveFocus()
  },
}


export const LocalizedHamburger: Story = {
  parameters: { docs: { description: { story: "Hamburger forwards localized labels, refs and consumer click handlers, including default prevention that cancels toggling." } } },
  render: () => {
    const [allowOpening, setAllowOpening] = useState(false)
    return <div className="max-w-sm">
      <Header>
        <Header.Hamburger aria-label="Otevřít nabídku" data-custom="menu"
          ref={(node) => { node?.setAttribute("data-ref-attached", "true") }}
          onClick={(event) => { if (!allowOpening) event.preventDefault() }} />
        <Header.Mobile><Navigation label="Mobile navigation" /></Header.Mobile>
      </Header>
      <Button theme="outlined" onClick={() => setAllowOpening(true)}>Allow menu opening</Button>
    </div>
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Otevřít nabídku" })
    await expect(trigger).toHaveAttribute("data-custom", "menu")
    await expect(trigger).toHaveAttribute("data-ref-attached", "true")
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(canvas.getByRole("button", { name: "Allow menu opening" }))
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{Escape}")
  },
}
