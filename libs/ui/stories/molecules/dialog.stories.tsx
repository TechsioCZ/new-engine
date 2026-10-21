import type { Meta, StoryObj } from "@storybook/react"
import { useId, useRef, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { Dialog, type DialogProps } from "../../src/molecules/dialog"
import { FormInput } from "../../src/molecules/form-input"
import { Popover } from "../../src/molecules/popover"

const meta = {
  title: "Molecules/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    controls: {
      disable: true,
      include: [
        "triggerText",
        "title",
        "description",
        "size",
        "behavior",
        "closeOnEscape",
        "closeOnInteractOutside",
        "hideCloseButton",
      ],
    },
    docs: {
      description: {
        component:
          "Dialog presents a focused task or confirmation over the current page, with accessible naming and focus management; use Drawer for edge panels, Popover for anchored content, and Toast for completed-action feedback.",
      },
    },
  },
  argTypes: {
    triggerText: { control: "text" },
    title: { control: "text" },
    description: { control: "text" },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "full"],
    },
    behavior: {
      control: "select",
      options: ["modal", "modeless"],
      description:
        "Modeless leaves background controls and scrolling available.",
    },
    closeOnEscape: { control: "boolean" },
    closeOnInteractOutside: { control: "boolean" },
    hideCloseButton: { control: "boolean" },
  },
  args: {
    triggerText: "Review changes",
    title: "Publish catalog changes?",
    description:
      "Twelve updated products will become visible in your storefront.",
    size: "md",
    behavior: "modal",
    closeOnEscape: true,
    closeOnInteractOutside: true,
    hideCloseButton: false,
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

function PlaygroundDialog(args: DialogProps) {
  const [open, setOpen] = useState(false)
  const [published, setPublished] = useState(false)
  return (
    <div className="flex flex-col items-center gap-150">
      <Dialog
        {...args}
        open={open}
        onOpenChange={({ open }) => setOpen(open)}
        actions={
          <>
            <Button
              variant="tertiary"
              theme="outlined"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setPublished(true)
                setOpen(false)
              }}
            >
              Publish changes
            </Button>
          </>
        }
      >
        <p className="text-fg-secondary text-sm">
          Your existing product URLs and inventory settings will stay the same.
        </p>
      </Dialog>
      <StatusText
        role="status"
        status={published ? "success" : "default"}
        showIcon={published}
      >
        {published
          ? "Catalog changes published in this demo."
          : "Changes are ready for review."}
      </StatusText>
    </div>
  )
}

export const Playground: Story = {
  parameters: {
    controls: { disable: false },
    docs: {
      description: {
        story:
          "A publish confirmation demonstrates working controls and a neutral Cancel paired with one primary action.",
      },
    },
  },
  render: (args) => <PlaygroundDialog {...args} />,
}

export const ControlledEscape: Story = {
  tags: ["ui-runtime-regression"],
  parameters: {
    docs: {
      description: {
        story:
          "A controlled dialog and nested popover demonstrate Escape dismissal order and an explicit Escape-disabled exception.",
      },
    },
  },
  render: () => {
    const [open, setOpen] = useState(false)
    const [escapeDisabledOpen, setEscapeDisabledOpen] = useState(false)

    return (
      <div className="flex gap-150">
        <Button onClick={() => setOpen(true)}>Open controlled dialog</Button>
        <Dialog
          open={open}
          onOpenChange={({ open: nextOpen }) => setOpen(nextOpen)}
          customTrigger
          title="Controlled escape dialog"
          description="Escape dismisses the most recently opened popup."
        >
          <Popover>
            <Popover.Trigger>Open nested popover</Popover.Trigger>
            <Popover.Positioner>
              <Popover.Content>
                <Popover.Title>Nested escape popover</Popover.Title>
                <Popover.Description>
                  Nested popup description.
                </Popover.Description>
                <Popover.CloseTrigger>
                  Close nested popover
                </Popover.CloseTrigger>
              </Popover.Content>
            </Popover.Positioner>
          </Popover>
        </Dialog>
        <Button onClick={() => setEscapeDisabledOpen(true)}>
          Open escape-disabled dialog
        </Button>
        <Dialog
          open={escapeDisabledOpen}
          onOpenChange={({ open: nextOpen }) => setEscapeDisabledOpen(nextOpen)}
          customTrigger
          closeOnEscape={false}
          title="Escape disabled dialog"
          description="Use the close button to dismiss this dialog."
        />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const openDialog = canvas.getByRole("button", {
      name: "Open controlled dialog",
    })

    await userEvent.click(openDialog)
    await waitFor(() => {
      expect(
        page.getByRole("dialog", { name: "Controlled escape dialog" })
      ).toBeVisible()
    })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(
        page.queryByRole("dialog", { name: "Controlled escape dialog" })
      ).toBeNull()
    })

    await userEvent.click(openDialog)
    const dialog = await page.findByRole("dialog", {
      name: "Controlled escape dialog",
    })
    await userEvent.click(
      within(dialog).getByRole("button", {
        name: "Open nested popover",
      })
    )
    await waitFor(() => {
      expect(
        page.getByRole("dialog", { name: "Nested escape popover" })
      ).toBeVisible()
      expect(
        page.getByRole("dialog", { name: "Nested escape popover" })
      ).toHaveAccessibleDescription("Nested popup description.")
    })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(
        page.queryByRole("dialog", { name: "Nested escape popover" })
      ).toBeNull()
      expect(
        page.getByRole("dialog", { name: "Controlled escape dialog" })
      ).toBeVisible()
    })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(
        page.queryByRole("dialog", { name: "Controlled escape dialog" })
      ).toBeNull()
    })

    await userEvent.click(
      canvas.getByRole("button", {
        name: "Open escape-disabled dialog",
      })
    )
    const escapeDisabledDialog = await page.findByRole("dialog", {
      name: "Escape disabled dialog",
    })
    await userEvent.keyboard("{Escape}")
    await expect(escapeDisabledDialog).toBeVisible()
    await userEvent.click(
      within(escapeDisabledDialog).getByRole("button", {
        name: "Close dialog",
      })
    )
    await waitFor(() => {
      expect(
        page.queryByRole("dialog", { name: "Escape disabled dialog" })
      ).toBeNull()
    })
  },
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Content-sized centered dialogs show the available widths while retaining a safe viewport gutter on small screens.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Centered dialog widths">
        {(["xs", "sm", "md", "lg", "xl", "full"] as const).map((size) => (
          <Dialog
            key={size}
            size={size}
            triggerText={size.toUpperCase()}
            title={`${size.toUpperCase()} dialog`}
            description="Choose a width that fits the task rather than the amount of surrounding screen space."
          >
            <p className="text-sm text-fg-secondary">
              Small confirmations need less space than detailed forms.
            </p>
          </Dialog>
        ))}
      </VariantGroup>
    </VariantContainer>
  ),
}

function DeleteAccountExample() {
  const [open, setOpen] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <div className="flex flex-col items-center gap-150">
      <Button variant="danger" theme="outlined" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <Dialog
        open={open}
        onOpenChange={({ open }) => setOpen(open)}
        customTrigger
        role="alertdialog"
        size="sm"
        title="Delete the Northstar account?"
        description="All projects and saved files in Northstar will be permanently removed. This cannot be undone."
        closeOnInteractOutside={false}
        initialFocusEl={() => cancelRef.current}
        actions={
          <>
            <Button
              ref={cancelRef}
              variant="tertiary"
              theme="outlined"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleted(true)
                setOpen(false)
              }}
            >
              Delete account
            </Button>
          </>
        }
      />
      <StatusText
        role="status"
        status={deleted ? "success" : "default"}
        showIcon={deleted}
      >
        {deleted
          ? "Account deleted in this demo. No real data was removed."
          : "Demo account: Northstar"}
      </StatusText>
    </div>
  )
}

export const AlertDialog: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An irreversible account deletion focuses the neutral Cancel first and reserves danger styling for the destructive action.",
      },
    },
  },
  render: () => <DeleteAccountExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete account" })
    )
    const alert = await page.findByRole("alertdialog", {
      name: "Delete the Northstar account?",
    })
    await waitFor(() =>
      expect(
        within(alert).getByRole("button", { name: "Cancel" })
      ).toHaveFocus()
    )
    await userEvent.click(within(alert).getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(page.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
  },
}

function EditProfileExample() {
  const formId = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("Alex Morgan")
  const [saved, setSaved] = useState("Alex Morgan")
  return (
    <div className="flex flex-col items-center gap-150">
      <Button
        onClick={() => {
          setName(saved)
          setOpen(true)
        }}
      >
        Edit profile
      </Button>
      <Dialog
        customTrigger
        open={open}
        onOpenChange={({ open }) => setOpen(open)}
        title="Edit profile"
        description="Update the name your teammates see in the workspace."
        size="sm"
        actions={
          <>
            <Button
              variant="tertiary"
              theme="outlined"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form={formId}>
              Save changes
            </Button>
          </>
        }
      >
        <form
          id={formId}
          onSubmit={(event) => {
            event.preventDefault()
            setSaved(name.trim())
            setOpen(false)
          }}
        >
          <FormInput
            label="Display name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            pattern={String.raw`.*\S.*`}
            autoComplete="name"
          />
        </form>
      </Dialog>
      <StatusText role="status">Profile name: {saved}</StatusText>
    </div>
  )
}

export const RichContent: Story = {
  name: "Editable profile",
  parameters: {
    docs: {
      description: {
        story:
          "A labelled profile form uses native validation, persists saved changes locally, and discards edits when cancelled.",
      },
    },
  },
  render: () => <EditProfileExample />,
}

export const Minimal: Story = {
  parameters: {
    controls: { disable: false },
    docs: {
      description: {
        story:
          "A short, titled informational dialog needs only the built-in close action rather than an unnecessary confirmation footer.",
      },
    },
  },
  args: {
    triggerText: "View delivery note",
    title: "Delivery instructions",
    description:
      "Deliveries arrive at reception on weekdays between 09:00 and 17:00.",
  },
}

function ModelessExample() {
  const [refreshes, setRefreshes] = useState(0)
  return (
    <div className="flex min-h-screen flex-col items-start gap-150 p-300">
      <Button
        variant="tertiary"
        theme="outlined"
        onClick={() => setRefreshes((count) => count + 1)}
      >
        Refresh results
      </Button>
      <StatusText role="status">Refreshes: {refreshes}</StatusText>
      <Dialog
        behavior="modeless"
        closeOnInteractOutside={false}
        triggerText="Open activity window"
        title="Recent activity"
        description="This window leaves background controls and scrolling available."
        size="sm"
      >
        <p className="text-fg-secondary text-sm">
          Twelve catalog records were updated today.
        </p>
      </Dialog>
    </div>
  )
}

export const Modeless: Story = {
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        story:
          "A non-modal activity window leaves the page interactive without requiring separate focus-trap or scroll-lock overrides.",
      },
    },
  },
  render: () => <ModelessExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      canvas.getByRole("button", { name: "Open activity window" })
    )
    const dialog = await page.findByRole("dialog", { name: "Recent activity" })
    await expect(dialog).toHaveAttribute("aria-modal", "false")
    await userEvent.click(
      canvas.getByRole("button", { name: "Refresh results" })
    )
    await expect(canvas.getByText("Refreshes: 1")).toBeVisible()
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Close dialog" })
    )
  },
}

export const BehaviorTests: Story = {
  name: "Dismissal options",
  parameters: {
    docs: {
      description: {
        story:
          "Two explicit dismissal exceptions show when Escape or outside-click dismissal is disabled while keeping a visible close button.",
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-200">
      <Dialog
        triggerText="Review Escape exception"
        title="Escape dismissal disabled"
        description="Pressing Escape keeps this dialog open; use Close dialog to leave."
        closeOnEscape={false}
      />
      <Dialog
        triggerText="Review outside-click exception"
        title="Outside dismissal disabled"
        description="Clicking outside keeps this dialog open; use Escape or Close dialog to leave."
        closeOnInteractOutside={false}
      />
    </div>
  ),
}
