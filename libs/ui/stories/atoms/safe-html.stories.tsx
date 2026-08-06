import type { Meta, StoryObj } from "@storybook/react"

import { SafeHtml } from "../../src/atoms/safe-html"
import type { SafeHtmlPolicy } from "../../src/atoms/safe-html"

const STORY_POLICY: SafeHtmlPolicy = {
  allowedAttributes: {
    a: ["href", "rel", "target"],
  },
  allowedTags: ["a", "em", "li", "p", "strong", "ul"],
}

const meta: Meta<typeof SafeHtml> = {
  argTypes: {
    html: { control: "text" },
    policy: { control: false },
  },
  args: {
    html: '<p><strong>Sanitized content</strong> can include <em>emphasis</em> and <a href="https://example.com" target="_blank">safe links</a>.</p>',
    policy: STORY_POLICY,
  },
  component: SafeHtml,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Atoms/SafeHtml",
}

export default meta
type Story = StoryObj<typeof SafeHtml>

export const Playground: Story = {
  render: (args) => (
    <div className="max-w-container text-fg-primary">
      <SafeHtml {...args} />
    </div>
  ),
}

export const RejectsUnsafeMarkup: Story = {
  args: {
    html: '<p style="color:red" onclick="alert(1)">Visible text remains.</p><script>alert(1)</script><a href="javascript:alert(1)">Unsafe link becomes text.</a>',
  },
  render: (args) => (
    <div className="max-w-container text-fg-primary">
      <SafeHtml {...args} />
    </div>
  ),
}
