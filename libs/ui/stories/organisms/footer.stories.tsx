import type { Meta, StoryObj } from "@storybook/react"
import { useId } from "react"
import { expect, within } from "storybook/test"
import { Footer } from "../../src/organisms/footer"

function StoreFooter(props: React.ComponentProps<typeof Footer>) {
  const titleId = useId()
  return <Footer {...props} direction="vertical" aria-label="Store information">
    <Footer.Container>
      <Footer.Section aria-labelledby={titleId}>
        <Footer.Title id={titleId}>Workshop</Footer.Title>
        <Footer.Text>Reliable tools for your next project.</Footer.Text>
        <Footer.Link href="mailto:hello@workshop.example">hello@workshop.example</Footer.Link>
      </Footer.Section>
      <Footer.Section>
        <Footer.Title>Customer service</Footer.Title>
        <Footer.List>
          <Footer.Link href="/delivery">Delivery and collection</Footer.Link>
          <Footer.Link href="/returns">Returns and refunds</Footer.Link>
          <Footer.Link href="/contact">Contact us</Footer.Link>
        </Footer.List>
      </Footer.Section>
      <Footer.Section>
        <Footer.Title>About Workshop</Footer.Title>
        <Footer.List>
          <Footer.Link href="/about">Our story</Footer.Link>
          <Footer.Link href="/privacy">Privacy policy</Footer.Link>
          <Footer.Link href="/terms">Terms of service</Footer.Link>
        </Footer.List>
      </Footer.Section>
    </Footer.Container>
    <Footer.Bottom><Footer.Text>© 2026 Workshop</Footer.Text><Footer.Text>Built for everyday work.</Footer.Text></Footer.Bottom>
  </Footer>
}
const meta: Meta<typeof Footer> = {
  title: "Organisms/Footer", component: Footer, tags: ["autodocs"],
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode"] },
    layout: "fullscreen",
    docs: { description: { component: "Footer groups secondary site navigation, contact details and legal information at the end of a page. Sections reflow to a single mobile column; use Header for primary navigation and a plain content section for page-specific actions." } },
  },
  decorators: [(Story) => <div onClickCapture={(event) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) event.preventDefault()
  }}><Story /></div>],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    layout: { control: "select", options: ["col", "row"] },
    sectionFlow: { control: false }, direction: { control: false },
    children: { control: false, table: { disable: true } },
  },
  args: { size: "md", layout: "col", children: null },
  render: (args) => <StoreFooter {...args} />,
} satisfies Meta<typeof Footer>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: { docs: { description: { story: "Explore responsive service links and contact details; all demo navigation is prevented so the preview stays open." } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("contentinfo", { name: "Store information" })).toBeInTheDocument()
    await expect(canvas.getByRole("region", { name: "Workshop" })).toBeInTheDocument()
  },
}
export const Sizes: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Compare Small (sm), Medium (md) and Large (lg) with identical service information." } } },
  render: (args) => <div className="flex flex-col gap-400">
    {(["sm", "md", "lg"] as const).map((size) => <section key={size}>
      <h2 className="p-200">{{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]}</h2>
      <StoreFooter {...args} size={size} />
    </section>)}
  </div>,
}
export const RowLayout: Story = {
  args: { layout: "row" },
  parameters: { docs: { description: { story: "A wrapping row layout suits a small set of links without forcing mobile content beyond the viewport." } } },
}
