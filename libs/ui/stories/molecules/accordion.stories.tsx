import type { Meta, StoryObj } from "@storybook/react"
import { createRef, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Accordion } from "../../src/molecules/accordion"

const meta: Meta<typeof Accordion> = {
  title: "Molecules/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Related, collapsible sections for optional information such as shipping details, FAQs, and advanced settings. Use Tabs for peer views, Steps for a required sequence, and keep essential prices, legal terms, and validation errors visible. Compose Item, Header, Title, Indicator, and Content; Header supplies a level-3 heading unless aria-level changes it. Multiple allows independent panels; collapsible allows every panel to close. Strong triggers, inset secondary text, and dividers preserve scan hierarchy in every theme.",
      },
    },
  },
  argTypes: {
    size: {
      description: "Scales trigger text, spacing and indicators together.",
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
    shadow: {
      description:
        "Elevation around the disclosure group; none suits embedded sections.",
      control: "inline-radio",
      options: ["none", "sm", "md"],
    },
    variant: {
      description:
        "Default uses a surface; borderless removes dividers; child inherits the surrounding surface.",
      control: "inline-radio",
      options: ["default", "borderless", "child"],
    },
    multiple: {
      description: "Allow several answers to stay open independently.",
      control: "boolean",
    },
    collapsible: {
      description:
        "Allow every answer to close, including the last open panel.",
      control: "boolean",
    },
    disabled: {
      description: "Make all disclosure triggers unavailable.",
      control: "boolean",
    },
    dir: {
      description:
        "Mirror the logical layout and keyboard direction for right-to-left content.",
      control: "inline-radio",
      options: ["ltr", "rtl"],
    },
  },
  args: {
    size: "md",
    shadow: "none",
    variant: "default",
    multiple: false,
    collapsible: true,
    disabled: false,
    defaultValue: ["delivery"],
    onChange: fn(),
  },
}

export default meta
type Story = StoryObj<typeof Accordion>

const questions = [
  {
    value: "delivery",
    title: "When will my order arrive?",
    subtitle: "Delivery and tracking",
    content:
      "Orders leave our warehouse within two business days. Standard delivery takes another three to five business days; a tracking link is emailed as soon as your parcel ships.",
  },
  {
    value: "returns",
    title: "Can I return an item?",
    content:
      "You can return unused items in their original packaging within 30 days of delivery. Start a return from your order details and we will guide you through the next steps.",
  },
  {
    value: "collection",
    title: "Can I collect from the warehouse?",
    subtitle: "Unavailable during warehouse maintenance",
    content: "Collection will resume after warehouse maintenance is complete.",
    disabled: true,
  },
]

function Questions({
  includeCollection = false,
}: {
  includeCollection?: boolean
}) {
  return questions
    .filter((question) => includeCollection || !question.disabled)
    .map((question) => (
      <Accordion.Item
        value={question.value}
        disabled={question.disabled}
        key={question.value}
      >
        <Accordion.Header>
          <Accordion.Title>
            {question.title}
            {question.subtitle && (
              <Accordion.Subtitle>{question.subtitle}</Accordion.Subtitle>
            )}
          </Accordion.Title>
          <Accordion.Indicator />
        </Accordion.Header>
        <Accordion.Content>{question.content}</Accordion.Content>
      </Accordion.Item>
    ))
}

export const Playground: Story = {
  parameters: {
    docs: {
      source: {
        type: "code",
        language: "tsx",
        code: `import { Accordion } from "@techsio/ui-kit/molecules/accordion"

const questions = [
  {
    value: "delivery",
    title: "When will my order arrive?",
    subtitle: "Delivery and tracking",
    content:
      "Orders leave our warehouse within two business days. Standard delivery takes another three to five business days; a tracking link is emailed as soon as your parcel ships.",
  },
  {
    value: "returns",
    title: "Can I return an item?",
    content:
      "You can return unused items in their original packaging within 30 days of delivery. Start a return from your order details and we will guide you through the next steps.",
  },
  {
    value: "collection",
    title: "Can I collect from the warehouse?",
    subtitle: "Unavailable during warehouse maintenance",
    content: "Collection will resume after warehouse maintenance is complete.",
    disabled: true,
  },
]

export function DeliveryFAQ() {
  return (
    <Accordion
      defaultValue={["delivery"]}
      size="md"
      shadow="none"
      variant="default"
      multiple={false}
      collapsible
    >
      {questions.map((question) => (
        <Accordion.Item key={question.value} value={question.value} disabled={question.disabled}>
          <Accordion.Header>
            <Accordion.Title>
              {question.title}
              {question.subtitle && <Accordion.Subtitle>{question.subtitle}</Accordion.Subtitle>}
            </Accordion.Title>
            <Accordion.Indicator />
          </Accordion.Header>
          <Accordion.Content>{question.content}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}`,
      },
      description: {
        story:
          "Explore a delivery FAQ with an open answer and an explained unavailable option to compare panel hierarchy and disclosure behavior.",
      },
    },
  },
  render: (args) => (
    <div className="w-full max-w-lg">
      <Accordion {...args}>
        <Questions includeCollection />
      </Accordion>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", {
      name: /When will my order arrive/,
    })
    const disabled = canvas.getByRole("button", { name: /Can I collect/ })
    await expect(disabled).toBeDisabled()
    await expect(disabled).toHaveAttribute("data-disabled")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    trigger.focus()
    await userEvent.keyboard("{Home}")
    await expect(getComputedStyle(trigger).outlineStyle).toBe("solid")
    await expect(
      parseFloat(getComputedStyle(trigger).outlineWidth)
    ).toBeGreaterThan(0)
    await userEvent.keyboard("{Enter}")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.keyboard("{Enter}")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    const panel = canvas.getByRole("region", {
      name: /When will my order arrive/,
    })
    const triggerStyle = getComputedStyle(trigger)
    const panelStyle = getComputedStyle(panel)
    await expect(Number(triggerStyle.fontWeight)).toBe(
      Number(triggerStyle.getPropertyValue("--font-weight-accordion-trigger"))
    )
    await expect(Number(triggerStyle.fontWeight)).toBeGreaterThan(
      Number(panelStyle.fontWeight)
    )
    await expect(panelStyle.color).not.toBe(triggerStyle.color)
    await expect(parseFloat(panelStyle.paddingInlineStart)).toBeGreaterThan(
      parseFloat(triggerStyle.paddingInlineStart)
    )
  },
}

export const Multiple: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Keep several FAQ answers open together so readers can compare reference information without repeatedly collapsing sections.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-lg">
      <Accordion multiple defaultValue={["delivery", "returns"]}>
        <Questions />
      </Accordion>
    </div>
  ),
}

export const AllVariants: Story = {
  name: "Variants",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare framed, borderless, and inherited-surface variants without nested disclosures so you can choose the right visual weight.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-lg">
      <VariantContainer>
        {(["default", "borderless", "child"] as const).map((variant) => (
          <VariantGroup key={variant} title={variant} fullWidth>
            <Accordion variant={variant} defaultValue={["delivery"]}>
              <Questions />
            </Accordion>
          </VariantGroup>
        ))}
      </VariantContainer>
    </div>
  ),
}

export const SizeVariants: Story = {
  name: "Sizes",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare compact, regular, and spacious FAQ sections with open panels to check readable text hierarchy and padding at every size.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-lg">
      <VariantContainer>
        {(["sm", "md", "lg"] as const).map((size) => (
          <VariantGroup key={size} title={size} fullWidth>
            <Accordion size={size} defaultValue={["delivery"]}>
              <Questions />
            </Accordion>
          </VariantGroup>
        ))}
      </VariantContainer>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const triggers = canvas.getAllByRole("button", {
      name: /When will my order arrive/,
    })
    const panels = canvas.getAllByRole("region", {
      name: /When will my order arrive/,
    })
    for (const [index, panel] of panels.entries()) {
      const trigger = triggers[index]
      if (!trigger) throw new Error("Each panel needs its matching trigger")
      const triggerStyle = getComputedStyle(trigger)
      const panelStyle = getComputedStyle(panel)
      await expect(Number(triggerStyle.fontWeight)).toBeGreaterThan(
        Number(panelStyle.fontWeight)
      )
      await expect(parseFloat(panelStyle.paddingBlockStart)).toBeGreaterThan(0)
      await expect(parseFloat(panelStyle.paddingInlineStart)).toBeGreaterThan(
        parseFloat(triggerStyle.paddingInlineStart)
      )
    }
  },
}

export const ShadowVariants: Story = {
  name: "Shadows",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare no shadow with subtle and raised surfaces to choose the appropriate separation from surrounding page content.",
      },
    },
  },
  render: () => (
    <div className="w-full max-w-lg">
      <VariantContainer>
        {(["none", "sm", "md"] as const).map((shadow) => (
          <VariantGroup key={shadow} title={shadow} fullWidth>
            <Accordion shadow={shadow} defaultValue={["delivery"]}>
              <Questions />
            </Accordion>
          </VariantGroup>
        ))}
      </VariantContainer>
    </div>
  ),
}

export const CustomContent: Story = {
  name: "Structured content",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compose a badge, subtitle, and actionable order details inside a disclosure while keeping interactive controls out of its trigger.",
      },
    },
  },
  render: function Render() {
    const [trackingVisible, setTrackingVisible] = useState(false)
    return (
      <div className="w-full max-w-lg">
        <Accordion multiple defaultValue={["order"]}>
          <Accordion.Item value="order">
            <Accordion.Header>
              <Accordion.Title>
                Order TS-2048
                <Accordion.Subtitle>
                  Alpine daypack · shipped today
                </Accordion.Subtitle>
              </Accordion.Title>
              <span className="inline-flex items-center gap-150">
                <Badge variant="primary">Shipped</Badge>
                <Accordion.Indicator />
              </span>
            </Accordion.Header>
            <Accordion.Content>
              <div className="flex flex-col items-start gap-200">
                <p>
                  Your parcel is on its way. Delivery is expected within three
                  to five business days.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setTrackingVisible(!trackingVisible)}
                >
                  {trackingVisible
                    ? "Hide tracking details"
                    : "Show tracking details"}
                </Button>
                {trackingVisible && (
                  <p role="status">
                    Tracking TS-2048: collected by the carrier at 09:30.
                  </p>
                )}
              </div>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="care">
            <Accordion.Header>
              <Accordion.Title>Care instructions</Accordion.Title>
              <Accordion.Indicator />
            </Accordion.Header>
            <Accordion.Content>
              <ul className="list-disc ps-200">
                <li>Wipe clean with a damp cloth.</li>
                <li>Air dry away from direct heat.</li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    )
  },
}

export const ControlledAccordion: Story = {
  name: "Controlled sections",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Synchronize external expand and collapse actions with controlled section values so application state and disclosure state stay aligned.",
      },
    },
  },
  render: function Render() {
    const [value, setValue] = useState<string[]>(["delivery"])
    return (
      <div className="flex w-full max-w-lg flex-col gap-200">
        <div className="flex flex-wrap gap-100">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setValue(["delivery", "returns"])}
          >
            Expand all answers
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setValue([])}>
            Collapse all answers
          </Button>
        </div>
        <p className="text-sm text-fg-secondary" role="status">
          {value.length} of 2 answers open
        </p>
        <Accordion value={value} onChange={setValue} multiple>
          <Questions />
        </Accordion>
      </div>
    )
  },
}

export const ConditionalRendering: Story = {
  name: "Conditional sections",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Add international-delivery details only when relevant to keep optional sections focused without recreating disclosure state.",
      },
    },
  },
  render: function Render() {
    const [international, setInternational] = useState(false)
    return (
      <div className="flex w-full max-w-lg flex-col gap-200">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setInternational(!international)}
        >
          {international
            ? "Hide international delivery"
            : "Show international delivery"}
        </Button>
        <Accordion multiple defaultValue={["delivery"]}>
          <Questions />
          {international && (
            <Accordion.Item value="international">
              <Accordion.Header>
                <Accordion.Title>International delivery</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>
                International parcels usually arrive within 10 to 21 business
                days. Local duties may apply.
              </Accordion.Content>
            </Accordion.Item>
          )}
        </Accordion>
      </div>
    )
  },
}

const headingObjectRef = createRef<HTMLElement>()
const headingRefCleanup = fn()
const headingCallbackRef = fn((node: HTMLElement | null) => {
  if (node) return headingRefCleanup
  return undefined
})

export const HeadingSemantics: Story = {
  tags: ["ui-semantic-regression"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Verify semantic heading levels, keyboard expansion, and React 19 ref cleanup so accordion headings integrate accessibly into page outlines.",
      },
    },
  },
  render: () => {
    const [visible, setVisible] = useState(true)

    return (
      <div className="w-md flex flex-col gap-200">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "Hide accordion" : "Show accordion"}
        </Button>
        {visible && (
          <Accordion collapsible>
            <Accordion.Item value="default">
              <Accordion.Header ref={headingCallbackRef}>
                <Accordion.Title>Default heading</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>Default heading content.</Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="custom">
              <Accordion.Header aria-level={4} ref={headingObjectRef}>
                <Accordion.Title>Custom heading level</Accordion.Title>
                <Accordion.Indicator />
              </Accordion.Header>
              <Accordion.Content>Custom heading content.</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        )}
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    headingRefCleanup.mockClear()

    const defaultHeading = canvas.getByRole("heading", {
      name: "Default heading",
      level: 3,
    })
    const customHeading = canvas.getByRole("heading", {
      name: "Custom heading level",
      level: 4,
    })
    expect(canvas.queryAllByRole("banner")).toHaveLength(0)
    expect(defaultHeading.tagName).toBe("H3")
    expect(headingCallbackRef).toHaveBeenLastCalledWith(defaultHeading)
    expect(headingObjectRef.current).toBe(customHeading)

    const trigger = within(defaultHeading).getByRole("button", {
      name: "Default heading",
    })
    expect(defaultHeading.children).toHaveLength(1)
    await userEvent.click(trigger)
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true")
      expect(
        canvas.getByRole("region", { name: "Default heading" })
      ).toBeVisible()
    })
    await userEvent.keyboard("{Enter}")
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false")
    })
    expect(headingRefCleanup).not.toHaveBeenCalled()
    expect(headingObjectRef.current).toBe(customHeading)

    await userEvent.click(
      canvas.getByRole("button", { name: "Hide accordion" })
    )
    await waitFor(() => {
      expect(canvas.queryAllByRole("heading")).toHaveLength(0)
      expect(headingRefCleanup).toHaveBeenCalledTimes(1)
      expect(headingObjectRef.current).toBeNull()
    })
  },
}
