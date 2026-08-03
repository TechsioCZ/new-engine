import type { Meta, StoryObj } from "@storybook/react"

const meta: Meta = {
  title: "Overview/APCA Contrast Test",
  parameters: {
    layout: "centered",
    a11y: {
      context: "#apca-test-root",
    },
  },
}

export default meta
type Story = StoryObj

function renderContrastTest() {
  return (
    <div className="flex flex-col gap-4" id="apca-test-root">
      <div style={{ backgroundColor: "rgb(255, 255, 255)", padding: "16px" }}>
        <p
          style={{
            color: "rgb(170, 170, 170)",
            fontSize: "16px",
            fontWeight: 400,
          }}
        >
          Low contrast text (should fail APCA)
        </p>
        <p
          style={{
            color: "rgb(0, 0, 0)",
            fontSize: "16px",
            fontWeight: 600,
            marginTop: "8px",
          }}
        >
          High contrast text (should pass)
        </p>
        <p
          data-apca-usecase="sub-fluent"
          style={{
            color: "rgb(90, 90, 90)",
            fontSize: "12px",
            fontWeight: 400,
            marginTop: "6px",
          }}
        >
          Sub-fluent label (should fail size at gold/silver)
        </p>
      </div>
    </div>
  )
}

export const Default: Story = {
  render: renderContrastTest,
}

export const Silver: Story = {
  parameters: {
    a11y: {
      apca: {
        level: "silver",
        useCase: "body",
      },
    },
  },
  render: renderContrastTest,
}

export const Bronze: Story = {
  parameters: {
    a11y: {
      apca: {
        level: "bronze",
        useCase: "body",
      },
    },
  },
  render: renderContrastTest,
}
