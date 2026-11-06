import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { ActionIcon } from "../../src/atoms/action-icon"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { FormInput } from "../../src/molecules/form-input"
import { FormTextarea } from "../../src/molecules/form-textarea"
import { Switch } from "../../src/molecules/switch"
import { SelectTemplate } from "../../src/templates/select"
import { StatusBadge } from "../pages/shell"

type ReviewProps = { size: "sm" | "md" | "lg" }

function BusinessReview({ size }: ReviewProps) {
  const [saved, setSaved] = useState(false)
  const [nameError, setNameError] = useState(false)
  const [notifications, setNotifications] = useState(true)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-400 p-250 sm:p-400">
      <header className="flex flex-col gap-100">
        <div className="flex flex-wrap items-center gap-150">
          <h1 className="font-semibold text-xl">Business components</h1>
        </div>
        <p className="max-w-prose text-fg-secondary text-sm">
          Forms, actions and states for commerce workspaces.
        </p>
      </header>

      <div className="grid min-w-0 grid-cols-1 items-start gap-300 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-250 rounded-lg border border-border-primary bg-surface p-300">
          <div className="flex flex-col gap-50">
            <h2 className="font-semibold text-lg">Workspace form</h2>
            <p className="text-fg-secondary text-sm">
              An editable example with required-field validation.
            </p>
          </div>
          {/* This example owns validation for its one required field. */}
          <form
            className="flex flex-col gap-250"
            noValidate
            onChange={() => setSaved(false)}
            onReset={() => {
              setSaved(false)
              setNameError(false)
              setNotifications(true)
            }}
            onSubmit={(event) => {
              event.preventDefault()
              const form = event.currentTarget
              if (!String(new FormData(form).get("workspace") ?? "").trim()) {
                setNameError(true)
                setSaved(false)
                form
                  .querySelector<HTMLInputElement>('[name="workspace"]')
                  ?.focus()
                return
              }
              setNameError(false)
              setSaved(true)
            }}
          >
            <FormInput
              defaultValue="Northwind Commerce"
              label="Workspace name"
              helpText={
                nameError
                  ? "Enter a workspace name to save your changes."
                  : undefined
              }
              name="workspace"
              onChange={(event) => {
                if (event.currentTarget.value.trim()) {
                  setNameError(false)
                }
              }}
              required
              size={size}
              validateStatus={nameError ? "error" : "default"}
            />
            <SelectTemplate
              defaultValue={["eur"]}
              items={[
                { label: "Euro (EUR)", value: "eur" },
                { label: "Czech koruna (CZK)", value: "czk" },
                { label: "British pound (GBP)", value: "gbp" },
              ]}
              label="Default currency"
              name="currency"
              size={size}
            />
            <FormTextarea
              defaultValue="Order updates and fulfilment for the European team."
              label="Description"
              name="description"
              rows={3}
              size={size}
            />
            <Switch
              checked={notifications}
              helpText="Get a summary when new orders arrive."
              onCheckedChange={setNotifications}
              size={size}
            >
              Order notifications
            </Switch>
            <FormCheckbox
              defaultChecked
              label="Include weekly sales reports"
              size={size}
            />
            <div className="flex flex-wrap items-center justify-end gap-150 border-border-primary border-t pt-250">
              <Button
                size={size}
                theme="outlined"
                type="reset"
              >
                Reset
              </Button>
              <Button size={size} type="submit">
                Save changes
              </Button>
            </div>
            {saved && (
              <StatusText role="status" status="success">
                Workspace details saved.
              </StatusText>
            )}
          </form>
        </section>

        <div className="flex min-w-0 flex-col gap-300">
          <section className="flex flex-col gap-250 rounded-lg border border-border-primary bg-surface p-300">
            <h2 className="font-semibold text-lg">Button states</h2>
            <div className="flex flex-wrap items-center gap-150">
              <Button icon="icon-[mdi--plus]" size={size}>
                Create order
              </Button>
              <Button size={size} theme="outlined">
                Export
              </Button>
              <Button size={size} theme="borderless">
                View activity
              </Button>
              <ActionIcon
                aria-label="More actions"
                icon="icon-[mdi--dots-horizontal]"
                size={size}
              />
            </div>
            <div className="flex flex-wrap items-center gap-150">
              <Button disabled size={size}>
                Unavailable
              </Button>
              <Button isLoading size={size} theme="outlined">
                Loading example
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-200 rounded-lg border border-border-primary bg-surface p-300">
            <h2 className="font-semibold text-lg">Order statuses</h2>
            <div className="flex flex-wrap gap-100">
              {[
                "paid",
                "fulfilled",
                "pending",
                "refunded",
                "cancelled",
                "draft",
              ].map((status) => (
                <StatusBadge key={status} status={status} />
              ))}
            </div>
            <p className="text-fg-secondary text-sm">
              Payment and fulfilment labels.
            </p>
          </section>

          <section className="flex flex-col gap-250 rounded-lg border border-border-primary bg-surface p-300">
            <h2 className="font-semibold text-lg">Field examples</h2>
            <FormInput
              autoComplete="email"
              defaultValue="nora@"
              helpText="Enter a complete email address, such as nora@example.com."
              label="Billing email"
              size={size}
              type="email"
              validateStatus="error"
            />
            <FormInput
              defaultValue="NW-1024"
              helpText="Workspace IDs cannot be changed."
              label="Workspace ID"
              readOnly
              size={size}
            />
            <FormInput
              defaultValue="Available on the Enterprise plan"
              disabled
              label="Custom domain"
              size={size}
            />
          </section>
        </div>
      </div>
    </main>
  )
}

const meta = {
  title: "Overview/Business theme",
  component: BusinessReview,
  tags: ["autodocs"],
  parameters: {
    brandLock: "business",
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Review the light-only business theme with real workspace controls. Use this page to compare shared actions, forms and status colors together; use individual component stories for their complete APIs.",
      },
    },
  },
  argTypes: {
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
  args: { size: "md" },
} satisfies Meta<typeof BusinessReview>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Edit and save workspace details while comparing action hierarchy, status labels and field states at the selected control size.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const workspace = canvas.getByRole("textbox", { name: /Workspace name/ })
    await userEvent.clear(workspace)
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }))
    await expect(workspace).toHaveAttribute("aria-invalid", "true")
    await expect(workspace).toHaveFocus()
    await expect(
      canvas.getByText("Enter a workspace name to save your changes.")
    ).toBeVisible()
    await userEvent.type(workspace, "Northwind Commerce")
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }))
    await expect(canvas.getByText("Workspace details saved.")).toBeVisible()
    const reports = canvas.getByRole("checkbox", {
      name: "Include weekly sales reports",
    })
    await userEvent.click(reports)
    await expect(reports).not.toBeChecked()
    const checkboxControl = reports
      .closest('[data-scope="checkbox"][data-part="root"]')
      ?.querySelector('[data-scope="checkbox"][data-part="control"]')
    if (!checkboxControl) {
      throw new Error("The weekly reports checkbox control is missing.")
    }
    await waitFor(() =>
      expect(getComputedStyle(checkboxControl).borderColor).toBe(
        getComputedStyle(workspace).borderColor
      )
    )
    const notifications = canvas.getByRole("switch", {
      name: "Order notifications",
    })
    await userEvent.click(notifications)
    await expect(notifications).not.toBeChecked()
    await userEvent.click(canvas.getByRole("button", { name: "Reset" }))
    await expect(workspace).toHaveValue("Northwind Commerce")
    await expect(workspace).not.toHaveAttribute("aria-invalid", "true")
    await expect(canvas.queryByText("Workspace details saved.")).toBeNull()
    await expect(notifications).toBeChecked()
    await expect(reports).toBeChecked()
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }))
    await expect(canvas.getByText("Workspace details saved.")).toBeVisible()
    await expect(
      canvas.getByRole("textbox", { name: "Workspace ID" })
    ).toHaveAttribute("readonly")
    await expect(
      canvas.getByRole("textbox", { name: "Custom domain" })
    ).toBeDisabled()

    // An empty fixture checks the real CSS cascade without adding demo UI.
    const boundary = canvasElement.ownerDocument.createElement("div")
    canvasElement.append(boundary)
    try {
      for (const brand of ["base", "neo", "business"]) {
        boundary.setAttribute("data-theme", brand)
        const styles = getComputedStyle(boundary)
        await expect(styles.getPropertyValue("--text-md").trim()).toBe(
          brand === "business" ? "1rem" : "1.25rem"
        )
        await expect(
          Number.parseFloat(styles.getPropertyValue("--radius-sm"))
        ).toBe(
          brand === "business" ? 0.375 : 0.5
        )
      }
    } finally {
      boundary.remove()
    }
  },
}
