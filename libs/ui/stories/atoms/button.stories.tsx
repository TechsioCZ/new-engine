import type { Meta, StoryObj } from "@storybook/react"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { expect, fn, userEvent, within } from "storybook/test"
import { useState } from "react"
import { Input } from "../../src/atoms/input"
import { StatusText } from "../../src/atoms/status-text"
import { iconLabels, iconOptions } from "../helpers/icon-options"

const meta: Meta<typeof Button> = {
  title: "Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    composition: { table: { disable: true } },
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary", "warning", "danger"],
      description: "Controls the semantic style of the button",
      table: {
        defaultValue: { summary: "primary" },
      },
    },
    theme: {
      control: "select",
      options: ["solid", "light", "outlined", "borderless", "unstyled"],
      description: "Controls the visual weight/theme of the button",
      table: {
        defaultValue: { summary: "solid" },
      },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Controls the size of the button",
      table: {
        defaultValue: { summary: "md" },
      },
    },
    type: {
      control: "radio",
      options: ["button", "submit", "reset"],
      description: "The HTML type of the button",
      table: {
        defaultValue: { summary: "button" },
      },
    },
    block: {
      control: "boolean",
      description:
        "Whether the button should take up the full width of its container",
      table: {
        defaultValue: { summary: "false" },
      },
    },
    uppercase: {
      control: "boolean",
      description: "Whether the button text should be uppercase",
      table: {
        defaultValue: { summary: "false" },
      },
    },
    disabled: {
      control: "boolean",
      description: "Whether the button is disabled",
      table: {
        defaultValue: { summary: "false" },
      },
    },
    isLoading: {
      control: "boolean",
      description: "Whether the button is in a loading state",
      table: {
        defaultValue: { summary: "false" },
      },
    },
    loadingText: {
      control: "text",
      description: "Text to display when isLoading is true",
    },
    icon: {
      control: {
        type: "select",
        labels: iconLabels,
      },
      options: iconOptions,
      description: "Icon to display in the button",
    },
    iconPosition: {
      control: "radio",
      options: ["left", "right"],
      description: "Position of the icon relative to the text",
      table: {
        defaultValue: { summary: "left" },
      },
    },
    children: {
      control: "text",
      description: "Content of the button",
    },
    onClick: {
      description: "Click handler",
    },
  },
  args: {
    variant: "primary",
    theme: "solid",
    size: "md",
    type: "button",
    block: false,
    uppercase: false,
    disabled: false,
    isLoading: false,
    loadingText: "Loading...",
    children: "Save changes",
    iconPosition: "left",
    onClick: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          "A native action button with semantic hierarchy, loading feedback and visible keyboard focus. Use it for commands or form submission; choose Link or LinkButton for navigation.",
      },
    },
    layout: "centered",
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Playground: Story = {
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story:
          "Try semantic variants, visual weight, sizing and loading feedback with live controls.",
      },
    },
  },
  render: (args) => (
    <div className="w-md max-w-full">
      <Button {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const document = canvasElement.ownerDocument
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    )
  },
}

export const Variants: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare semantic action roles and visual treatments to choose one primary action per surface.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Solid themes">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="warning">Warning</Button>
        <Button variant="danger">Danger</Button>
      </VariantGroup>
      <VariantGroup title="Light themes">
        <Button variant="primary" theme="light">
          Primary Light
        </Button>
        <Button variant="secondary" theme="light">
          Secondary Light
        </Button>
        <Button variant="tertiary" theme="light">
          Tertiary Light
        </Button>
        <Button variant="warning" theme="light">
          Warning Light
        </Button>
        <Button variant="danger" theme="light">
          Danger Light
        </Button>
      </VariantGroup>
      <VariantGroup title="Outlined themes">
        <Button variant="primary" theme="outlined">
          Primary Outlined
        </Button>
        <Button variant="secondary" theme="outlined">
          Secondary Outlined
        </Button>
        <Button variant="tertiary" theme="outlined">
          Tertiary Outlined
        </Button>
        <Button variant="warning" theme="outlined">
          Warning Outlined
        </Button>
        <Button variant="danger" theme="outlined">
          Danger Outlined
        </Button>
      </VariantGroup>
      <VariantGroup title="Borderless themes">
        <Button variant="primary" theme="borderless">
          Primary Borderless
        </Button>
        <Button variant="secondary" theme="borderless">
          Secondary Borderless
        </Button>
        <Button variant="tertiary" theme="borderless">
          Tertiary Borderless
        </Button>
        <Button variant="warning" theme="borderless">
          Warning Borderless
        </Button>
        <Button variant="danger" theme="borderless">
          Danger Borderless
        </Button>
      </VariantGroup>
      <VariantGroup title="Block (full width)" fullWidth>
        <Button block>Primary Block</Button>
        <Button variant="secondary" block>
          Secondary Block
        </Button>
        <Button variant="primary" theme="outlined" block>
          Outlined Block
        </Button>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "The same Save changes action uses Small (sm), Medium (md) and Large (lg) shared control heights.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size) => (
        <VariantGroup
          key={size}
          title={
            { sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]
          }
        >
          <Button size={size}>Save changes</Button>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

export const States: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Loading and disabled buttons retain a clear label while preventing repeated activation.",
      },
    },
  },
  render: () => {
    return (
      <VariantContainer>
        <VariantGroup title="Disabled states">
          <Button disabled>Solid</Button>
          <Button variant="secondary" theme="light" disabled>
            Light
          </Button>
          <Button variant="tertiary" theme="borderless" disabled>
            Borderless
          </Button>
          <Button variant="warning" theme="outlined" disabled>
            Outlined
          </Button>
        </VariantGroup>

        <VariantGroup title="Loading states">
          <Button isLoading>Primary</Button>
          <Button isLoading theme="outlined" loadingText="Loading...">
            Outlined
          </Button>

          <Button variant="danger" isLoading>
            Danger
          </Button>
        </VariantGroup>
      </VariantContainer>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const disabled = canvas.getByRole("button", { name: "Solid" })
    const loading = canvas.getByRole("button", { name: "Primary" })
    const danger = canvas.getByRole("button", { name: "Danger" })
    await expect(loading).toHaveAttribute("aria-busy", "true")
    await expect(loading).toHaveAttribute("aria-disabled", "true")
    // Busy keeps the variant fill; only genuinely unavailable buttons go grey.
    const disabledFill = getComputedStyle(disabled).backgroundColor
    await expect(getComputedStyle(loading).backgroundColor).not.toBe(
      disabledFill
    )
    await expect(getComputedStyle(danger).backgroundColor).not.toBe(
      disabledFill
    )
  },
}

export const AllVariants: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare every semantic variant and visual treatment, including genuine light treatments and pressed feedback.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      {(["solid", "light", "outlined", "borderless", "unstyled"] as const).map(
        (theme) => (
          <VariantGroup key={theme} title={`${theme} variants`}>
            <div className="grid w-full grid-cols-2 justify-items-start gap-200 sm:flex sm:flex-wrap sm:gap-400">
              {(
                ["primary", "secondary", "tertiary", "warning", "danger"] as const
              ).map((variant) => (
                <Button
                  data-variant={variant}
                  data-theme-treatment={theme}
                  key={variant}
                  theme={theme}
                  variant={variant}
                >
                  {variant === "danger"
                    ? "Delete project"
                    : variant === "warning"
                      ? "Review warning"
                      : variant === "secondary"
                        ? "View activity"
                        : variant === "tertiary"
                          ? "Explore details"
                          : "Save changes"}
                </Button>
              ))}
            </div>
          </VariantGroup>
        )
      )}
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    const document = canvasElement.ownerDocument
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    )
    if (document.defaultView?.matchMedia("(min-width: 40rem)").matches) {
      return
    }
    for (const theme of ["solid", "light", "outlined", "borderless", "unstyled"]) {
      const buttons = Array.from(
        canvasElement.querySelectorAll<HTMLButtonElement>(
          `button[data-theme-treatment="${theme}"]`
        )
      )
      await expect(buttons).toHaveLength(5)
      const bounds = buttons.map((button) => button.getBoundingClientRect())
      const [first, second, third, fourth] = bounds
      if (!(first && second && third && fourth)) {
        throw new Error("All button matrix rows must have measurable controls")
      }
      for (const [index, bound] of bounds.entries()) {
        await expect(bound.width).toBeGreaterThan(0)
        await expect(bound.right).toBeLessThanOrEqual(
          document.documentElement.clientWidth
        )
        await expect(
          Math.abs(bound.left - (index % 2 === 0 ? first.left : second.left))
        ).toBeLessThanOrEqual(1)
      }
      await expect(second.left).toBeGreaterThan(first.left)
      await expect(Math.abs(first.top - second.top)).toBeLessThanOrEqual(1)
      await expect(Math.abs(third.top - fourth.top)).toBeLessThanOrEqual(1)
    }
  },
}

export const IconButtons: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Icons reinforce visible action labels; icon-only actions require an accessible name.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Icon buttons">
        <Button icon="icon-[mdi--thumb-up]">Like</Button>
        <Button icon="icon-[mdi--send]" iconPosition="right">
          Send
        </Button>
        <Button icon="icon-[mdi--magnify]" aria-label="Search" />
        <Button variant="secondary" icon="icon-[mdi--pencil]">
          Edit
        </Button>
        <Button variant="danger" icon="icon-[mdi--delete]">
          Delete
        </Button>
      </VariantGroup>
    </VariantContainer>
  ),
}

function PendingActionExample() {
  const [pending, setPending] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [result, setResult] = useState<"default" | "success" | "error">(
    "default"
  )
  return (
    <form
      className="flex w-xs max-w-full flex-col gap-200"
      onSubmit={(event) => {
        event.preventDefault()
        if (pending) return
        setPending(true)
        setAttempts((value) => value + 1)
        setResult("default")
      }}
    >
      <Input aria-label="Project name" defaultValue="Autumn collection" />
      <Button type="submit" isLoading={pending} loadingText="Saving changes…">
        Save changes
      </Button>
      <p>
        Save attempts: <output data-testid="save-attempts">{attempts}</output>
      </p>
      <div className="flex flex-wrap gap-150">
        <Button
          theme="outlined"
          onClick={() => {
            setPending(false)
            setResult("success")
          }}
        >
          Complete save
        </Button>
        <Button
          theme="outlined"
          onClick={() => {
            setPending(false)
            setResult("error")
          }}
        >
          Fail save
        </Button>
        <Button
          type="reset"
          isLoading={pending}
          loadingText="Reset unavailable while saving"
          theme="outlined"
        >
          Reset project name
        </Button>
      </div>
      <StatusText status={result}>
        {pending
          ? "Saving your changes."
          : result === "success"
            ? "Changes saved."
            : result === "error"
              ? "Changes could not be saved. Try Save changes again."
              : "Start a save, then complete or fail it to inspect focus and retry."}
      </StatusText>
    </form>
  )
}

export const PendingAction: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Pending submission retains focus and suppresses repeat activation; completion or failure allows a retry without stealing focus.",
      },
    },
  },
  render: () => <PendingActionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const save = canvas.getByRole("button", { name: "Save changes" })
    save.focus()
    await userEvent.keyboard("{Enter}")
    await expect(save).toHaveFocus()
    await expect(save).toHaveAttribute("aria-busy", "true")
    await expect(save).not.toBeDisabled()
    await userEvent.keyboard("{Enter} ")
    await userEvent.click(save)
    await expect(canvas.getByTestId("save-attempts")).toHaveTextContent("1")
    const fail = canvas.getByRole("button", { name: "Fail save" })
    await userEvent.click(fail)
    await expect(fail).toHaveFocus()
    await expect(save).not.toHaveAttribute("aria-busy")
    await userEvent.click(save)
    await expect(save).toHaveFocus()
    await expect(canvas.getByTestId("save-attempts")).toHaveTextContent("2")
    const complete = canvas.getByRole("button", { name: "Complete save" })
    await userEvent.click(complete)
    await expect(complete).toHaveFocus()
    await expect(canvas.getByText("Changes saved.")).toBeVisible()
  },
}
