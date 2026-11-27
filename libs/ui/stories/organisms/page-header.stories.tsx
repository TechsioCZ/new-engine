import type { Meta, StoryObj } from "@storybook/react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { PageHeader } from "../../src/organisms/page-header"
import { BreadcrumbTemplate } from "../../src/templates/breadcrumb"

const meta = {
  title: "Organisms/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The one header of a page: where you are (breadcrumb or back link), what this is (title, status badges, description) and what you can do (actions, primary last). The title is the page's only h1.",
      },
    },
  },
  argTypes: {
    title: { control: "text", description: "The page's h1." },
    description: { control: "text", description: "One sentence on what the page is for." },
    breadcrumb: { control: false, description: "A BreadcrumbTemplate or a back link above the title." },
    meta: { control: false, description: "Status badges beside the title." },
    actions: { control: false, description: "Page actions, primary last." },
    ref: { control: false, table: { disable: true } },
  },
  args: {
    title: "Orders",
    description: "Every order across your sales channels, newest first.",
  },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <PageHeader
      {...args}
      actions={
        <>
          <Button appearance="outline" severity="secondary" size="sm">
            Export
          </Button>
          <Button severity="primary" size="sm">
            New order
          </Button>
        </>
      }
      breadcrumb={
        <BreadcrumbTemplate
          items={[
            { label: "Sales", href: "#" },
            { label: "Orders", isCurrent: true },
          ]}
          size="sm"
        />
      }
    />
  ),
}

export const DetailPage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A record page: a back link instead of a breadcrumb, and the record's status as a badge beside its name.",
      },
    },
  },
  args: { title: "Order 2026-0142", description: undefined },
  render: (args) => (
    <PageHeader
      {...args}
      actions={<Button size="sm">Mark as shipped</Button>}
      breadcrumb={
        <div>
          <Button
            appearance="outline"
            icon="icon-[mdi--arrow-left]"
            severity="secondary"
            size="sm"
          >
            Back to orders
          </Button>
        </div>
      }
      meta={
        <Badge severity="warning" size="sm">
          Awaiting payment
        </Badge>
      }
    />
  ),
}

export const TitleOnly: Story = {
  args: { description: undefined },
}
