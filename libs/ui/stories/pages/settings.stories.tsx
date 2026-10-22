import { expect, userEvent, waitFor, within } from "storybook/test"
import { DemoBoundary } from "./demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { Combobox } from "../../src/molecules/combobox"
import { Dialog } from "../../src/molecules/dialog"
import { FormInput } from "../../src/molecules/form-input"
import { RadioGroup } from "../../src/molecules/radio-group"
import { Switch } from "../../src/molecules/switch"
import { Tabs } from "../../src/molecules/tabs"
import { Toaster, useToast } from "../../src/molecules/toast"
import type { ColumnDef } from "../../src/organisms/data-table"
import { DataTable } from "../../src/organisms/data-table"
import { SelectTemplate } from "../../src/templates/select"
import { adminNav } from "./data"
import {
  Brand,
  Frame,
  GlobalSearch,
  NavDrawer,
  NavList,
  Panel,
  TopBar,
} from "./frame"
import { PageHeader, SectionCard, StatusBadge } from "./shell"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],
  tags: ["autodocs"],
  title: "Pages/System/Settings",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Settings are a navigation problem before they are a form problem. Vertical",
          "`Tabs` give every group a stable, linkable home instead of one scroll that",
          "nobody can find twice.",
          "",
          "**Pattern rules**",
          "- Group by the user's mental model (workspace, team, notifications, billing),",
          "  never by the database table the values live in.",
          "- Each setting states its consequence in help text; a toggle whose effect is",
          "  unclear will simply never be touched.",
          "- Toggles save on change and confirm with a toast. Text fields save explicitly,",
          "  with `Save changes` at the bottom-right of their section, after the last",
          "  field. Never mix the two silently in one group.",
          "- Dangerous settings (deleting a workspace, rotating keys) are grouped at the",
          "  bottom and confirm through an `alertdialog`.",
          "- Roles and members belong in a table, not a form — they are records.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

type Member = {
  id: string
  name: string
  email: string
  role: string
  status: string
}

const members: Member[] = [
  {
    id: "m-1",
    name: "Nora Kessler",
    email: "nora@northwind.example",
    role: "Owner",
    status: "active",
  },
  {
    id: "m-2",
    name: "Tom Hayes",
    email: "tom@northwind.example",
    role: "Admin",
    status: "active",
  },
  {
    id: "m-3",
    name: "Alicia Moreau",
    email: "alicia@northwind.example",
    role: "Editor",
    status: "active",
  },
  {
    id: "m-4",
    name: "Ivan Petrov",
    email: "ivan@northwind.example",
    role: "Editor",
    status: "pending",
  },
]

const roleItems = [
  { label: "Owner", value: "owner" },
  { label: "Admin", value: "admin" },
  { label: "Editor", value: "editor" },
  { label: "Viewer", value: "viewer" },
]

const timezoneItems = [
  { id: "prague", label: "Europe/Prague", value: "Europe/Prague" },
  { id: "london", label: "Europe/London", value: "Europe/London" },
  { id: "berlin", label: "Europe/Berlin", value: "Europe/Berlin" },
  { id: "newyork", label: "America/New_York", value: "America/New_York" },
]

const notificationFrequencies = [
  {
    value: "instant",
    label: "Every event, immediately",
    description: "Best for on-call operators; noisy for everyone else.",
  },
  {
    value: "digest",
    label: "One digest per day",
    description: "Sent at 08:00 in the workspace time zone.",
  },
  {
    value: "off",
    label: "No notifications",
    description: "Alerts still appear in the admin, just not in your inbox.",
  },
]

const currencyItems = [
  { label: "EUR — Euro", value: "EUR" },
  { label: "CZK — Czech koruna", value: "CZK" },
  { label: "USD — US dollar", value: "USD" },
]

function CheckoutNumberSetting({
  id,
  label,
  initialValue,
  hint,
  onSaved,
}: {
  id: string
  label: string
  initialValue: string
  hint: string
  onSaved: (label: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  const [invalid, setInvalid] = useState(false)
  return (
    <FormInput
      id={id}
      label={label}
      type="number"
      min={0}
      step={1}
      required
      value={value}
      validateStatus={invalid ? "error" : "default"}
      helpText={invalid ? "Enter a whole number of zero or more." : hint}
      onChange={(event) => {
        setValue(event.target.value)
        setInvalid(false)
      }}
      onBlur={(event) => {
        const valid = event.target.value !== "" && event.target.validity.valid
        setInvalid(!valid)
        if (valid) onSaved(`${label} saved in this demo`)
      }}
    />
  )
}

function SettingsPage() {
  const toaster = useToast()
  const [nav, setNav] = useState("settings-team")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [workspaceDeleted, setWorkspaceDeleted] = useState(false)
  const [team, setTeam] = useState(members)
  const [removing, setRemoving] = useState<Member | null>(null)
  const [workspaceName, setWorkspaceName] = useState("Northwind Commerce")
  const [nameInvalid, setNameInvalid] = useState(false)
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const media = window.matchMedia("(min-width: 64rem)")
    const update = () => setWide(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const memberColumns: ColumnDef<Member, unknown>[] = [
    {
      accessorKey: "name",
      header: "Member",
      meta: { type: "string", width: 240 },
      cell: (info) => (
        <span className="flex flex-col gap-50">
          <span className="font-medium">{info.getValue<string>()}</span>
          <span className="text-fg-secondary text-xs">
            {info.row.original.email}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      meta: { type: "string", width: 140 },
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { type: "string", width: 130 },
      cell: (info) => <StatusBadge status={info.getValue<string>()} />,
    },
  ]

  const saved = (what: string) =>
    toaster.create({
      type: "success",
      title: "Settings saved",
      description: what,
    })

  if (workspaceDeleted)
    return (
      <Frame top={<TopBar />}>
        <h1 className="font-semibold text-xl">Demo workspace deleted</h1>
        <StatusText role="status">
          The local example is closed. No live products, orders, customers or
          workspace were deleted.
        </StatusText>
        <Button variant="secondary" onClick={() => setWorkspaceDeleted(false)}>
          Restore demo workspace
        </Button>
      </Frame>
    )

  return (
    <Frame
      left={
        <Panel label="Main navigation" side="start">
          <Brand />
          <NavList
            defaultExpanded={["settings"]}
            nav={adminNav}
            onSelect={setNav}
            selected={nav}
          />
        </Panel>
      }
      top={
        <TopBar
          center={<GlobalSearch />}
          start={
            <NavDrawer
              defaultExpanded={["settings"]}
              nav={adminNav}
              onSelect={setNav}
              selected={nav}
            />
          }
        />
      }
    >
      <Toaster />

      <PageHeader
        breadcrumb={[{ label: "Home", href: "#" }, { label: "Settings" }]}
        description="Workspace-wide configuration. Changes apply to everyone in Northwind Commerce."
        title="Settings"
      />

      <Tabs
        className="flex-col lg:flex-row"
        defaultValue="general"
        justify="start"
        orientation={wide ? "vertical" : "horizontal"}
        variant="line"
      >
        <Tabs.List className="w-full shrink-0 lg:w-3xs">
          <Tabs.Trigger value="general">General</Tabs.Trigger>
          <Tabs.Trigger value="team">Team &amp; roles</Tabs.Trigger>
          <Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
          <Tabs.Trigger value="checkout">Checkout</Tabs.Trigger>
          <Tabs.Trigger value="danger">Advanced</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Content
          className="flex min-w-0 flex-1 flex-col gap-250"
          value="general"
        >
          <SectionCard
            description="How this workspace identifies itself in emails, invoices and the admin."
            title="Workspace"
          >
            <div className="flex max-w-2xl flex-col gap-200">
              <FormInput
                value={workspaceName}
                onChange={(event) => {
                  setWorkspaceName(event.target.value)
                  setNameInvalid(false)
                }}
                validateStatus={nameInvalid ? "error" : "default"}
                helpText={
                  nameInvalid
                    ? "Enter a workspace name before saving."
                    : undefined
                }
                id="ws-name"
                label="Workspace name"
                required
              />
              <FormInput
                defaultValue="northwind"
                helpText="Used in the admin URL: admin.example.com/northwind"
                id="ws-slug"
                label="Slug"
              />
              <Combobox
                clearable
                defaultValue={["Europe/Prague"]}
                items={timezoneItems}
                label="Time zone"
                name="timezone"
              />
              <SelectTemplate
                defaultValue={["EUR"]}
                items={currencyItems}
                label="Default currency"
              />
              {/* Explicit-save forms end with their action: bottom-right, after the last field. */}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (!workspaceName.trim()) {
                      setNameInvalid(true)
                      return
                    }
                    saved("Workspace details saved in this demo")
                  }}
                  size="sm"
                  variant="primary"
                >
                  Save changes
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            description="Toggles apply immediately — there is no save button for this group."
            title="Behaviour"
          >
            <div className="flex flex-col gap-200">
              <Switch
                defaultChecked
                helpText="New products are created as drafts and need an explicit publish."
                onCheckedChange={() => saved("Draft-first publishing")}
              >
                Draft-first publishing
              </Switch>
              <Switch
                helpText="Every destructive action is recorded with the actor and a diff."
                defaultChecked
                onCheckedChange={() => saved("Audit log")}
              >
                Keep an audit log
              </Switch>
              <Switch
                helpText="Admins can act as another user to reproduce a support issue."
                onCheckedChange={() => saved("Impersonation")}
              >
                Allow impersonation
              </Switch>
            </div>
          </SectionCard>
        </Tabs.Content>

        <Tabs.Content
          className="flex min-w-0 flex-1 flex-col gap-250"
          value="team"
        >
          <SectionCard
            actions={null}
            description="People are records, so they live in a table — searchable, sortable, with row actions."
            flush
            title="Members"
          >
            <DataTable
              columns={memberColumns}
              data={team}
              enableGlobalFilter
              enableSorting
              getRowId={(row) => row.id}
              getRowLabel={(row) => row.original.name}
              rowActions={[
                {
                  id: "remove",
                  label: "Remove from workspace",
                  icon: "icon-[mdi--account-remove-outline]",
                  tone: "danger",
                  disabled: (row) => row.original.role === "Owner",
                  onAction: (row) => setRemoving(row.original),
                },
              ]}
              size="sm"
              translations={{ searchPlaceholder: "Search members…" }}
            />
          </SectionCard>

          <SectionCard
            description="What a role can do, stated in plain language rather than permission codes."
            title="Default role for invitations"
          >
            <SelectTemplate
              className="max-w-sm"
              defaultValue={["editor"]}
              items={roleItems}
              label="Default role"
              onValueChange={() => saved("Default role")}
            />
          </SectionCard>
        </Tabs.Content>

        <Tabs.Content
          className="flex min-w-0 flex-1 flex-col gap-250"
          value="notifications"
        >
          <SectionCard
            description="Choose the channel per event class. Silence is a valid answer and must be reachable."
            title="Delivery"
          >
            <RadioGroup
              defaultValue="digest"
              onValueChange={() => saved("Notification frequency")}
            >
              <RadioGroup.Label>Frequency</RadioGroup.Label>
              <RadioGroup.ItemGroup>
                {notificationFrequencies.map((option) => (
                  <RadioGroup.Item key={option.value} value={option.value}>
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl />
                    <RadioGroup.ItemContent>
                      <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
                    </RadioGroup.ItemContent>
                    <RadioGroup.ItemDescription>
                      {option.description}
                    </RadioGroup.ItemDescription>
                  </RadioGroup.Item>
                ))}
              </RadioGroup.ItemGroup>
            </RadioGroup>
          </SectionCard>

          <SectionCard title="Events">
            <div className="flex flex-col gap-200">
              <Switch
                defaultChecked
                helpText="A paid order failed to reach the fulfilment queue."
                onCheckedChange={() => saved("Fulfilment failures")}
              >
                Fulfilment failures
              </Switch>
              <Switch
                defaultChecked
                helpText="A product drops below its reorder point."
                onCheckedChange={() => saved("Low stock")}
              >
                Low stock
              </Switch>
              <Switch
                helpText="Someone publishes or unpublishes a content page."
                onCheckedChange={() => saved("Content changes")}
              >
                Content changes
              </Switch>
              <Switch
                helpText="A new device signs in to an admin account."
                onCheckedChange={() => saved("New sign-ins")}
              >
                New sign-ins
              </Switch>
            </div>
          </SectionCard>
        </Tabs.Content>

        <Tabs.Content
          className="flex min-w-0 flex-1 flex-col gap-250"
          value="checkout"
        >
          <SectionCard
            description="These settings change checkout. Number fields save locally when you leave the field; use non-negative values. No storefront is changed by this demo."
            title="Checkout"
          >
            <div className="flex max-w-2xl flex-col gap-200">
              <Switch
                defaultChecked
                helpText="Shoppers can complete an order without creating an account."
                onCheckedChange={() => saved("Guest checkout")}
              >
                Guest checkout
              </Switch>
              <Switch
                defaultChecked
                helpText="Show the full tax breakdown before the payment step."
                onCheckedChange={() => saved("Itemised tax")}
              >
                Itemised tax
              </Switch>
              <CheckoutNumberSetting
                initialValue="50"
                hint="Order value in EUR above which standard delivery is free."
                id="co-free-shipping"
                label="Free delivery threshold"
                onSaved={saved}
              />
              <CheckoutNumberSetting
                initialValue="30"
                hint="Days a shopper has to start a return."
                id="co-returns"
                label="Return window"
                onSaved={saved}
              />
            </div>
          </SectionCard>
        </Tabs.Content>

        <Tabs.Content
          className="flex min-w-0 flex-1 flex-col gap-250"
          value="danger"
        >
          <SectionCard
            description="API credentials for this workspace. Rotating a key invalidates the old one immediately."
            title="API access"
          >
            <div className="flex flex-wrap items-center justify-between gap-150">
              <span className="flex flex-col gap-50">
                <span className="text-sm">Live secret key</span>
                <span className="text-fg-secondary text-xs">
                  sk_live_••••••••••••4f2a · last used 2 hours ago
                </span>
              </span>
              <div className="flex items-center gap-100">
                <Badge size="sm" variant="success">
                  Active
                </Badge>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            description="Irreversible, workspace-wide operations. Separated from everything else on purpose."
            title="Danger zone"
          >
            <div className="flex flex-wrap items-center justify-between gap-150">
              <p className="max-w-prose text-fg-secondary text-sm">
                Deleting the workspace removes every product, order and customer
                record. Exports stop working immediately.
              </p>
              <Button
                icon="icon-[mdi--delete-outline]"
                onClick={() => setConfirmDelete(true)}
                size="sm"
                theme="outlined"
                variant="danger"
              >
                Delete workspace
              </Button>
            </div>
          </SectionCard>
        </Tabs.Content>
      </Tabs>

      <Dialog
        customTrigger
        role="alertdialog"
        title={`Remove ${removing?.name ?? "member"}?`}
        description="This person will lose access to this demo workspace. You can invite them again later."
        open={removing !== null}
        onOpenChange={({ open }) => {
          if (!open) setRemoving(null)
        }}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (removing)
                  setTeam((current) =>
                    current.filter((member) => member.id !== removing.id)
                  )
                setRemoving(null)
              }}
            >
              Remove member
            </Button>
          </>
        }
      />

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setConfirmDelete(false)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmDelete(false)
                setWorkspaceDeleted(true)
              }}
              variant="danger"
            >
              Delete workspace
            </Button>
          </>
        }
        customTrigger
        description="This closes only the local demo workspace. No live products, orders or customer records will be deleted. A real workspace deletion is irreversible."
        onOpenChange={(details) => setConfirmDelete(details.open)}
        open={confirmDelete}
        role="alertdialog"
        size="sm"
        title="Delete this workspace?"
      />
    </Frame>
  )
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const expectSelectedIndicator = async (name: string) => {
      const tab = canvas.getByRole("tab", { name })
      await expect(tab).toHaveAttribute("aria-selected", "true")
      if (tab.getAttribute("data-orientation") !== "horizontal") return
      await waitFor(async () => {
        const indicator = tab.closest('[role="tablist"]')?.querySelector('[data-part="indicator"]')
        if (!indicator) throw new Error("Missing selected-tab indicator")
        const selectedBox = tab.getBoundingClientRect()
        const indicatorBox = indicator.getBoundingClientRect()
        await expect(Math.abs(selectedBox.left - indicatorBox.left)).toBeLessThan(2)
        await expect(Math.abs(selectedBox.width - indicatorBox.width)).toBeLessThan(2)
        await expect(Math.abs(selectedBox.bottom - indicatorBox.bottom)).toBeLessThan(3)
      })
    }
    await expectSelectedIndicator("General")
    const input = canvas.getByLabelText(/Workspace name/)
    await userEvent.clear(input)
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }))
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAccessibleDescription(
      "Enter a workspace name before saving."
    )
    await userEvent.type(input, "Northwind Commerce")
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }))
    await expect(input).not.toHaveAttribute("aria-invalid", "true")
    await userEvent.click(canvas.getByRole("tab", { name: "Team & roles" }))
    await expectSelectedIndicator("Team & roles")
    const member = canvas.getByRole("row", { name: /Tom Hayes/ })
    await userEvent.click(
      within(member).getByRole("button", { name: "Remove from workspace" })
    )
    const dialog = within(canvasElement.ownerDocument.body).getByRole(
      "alertdialog"
    )
    await expect(member).toBeInTheDocument()
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancel" })
    )
    await expect(member).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("tab", { name: "Checkout" }))
    await expectSelectedIndicator("Checkout")
    const returns = canvas.getByRole("spinbutton", { name: /Return window/ })
    await userEvent.clear(returns)
    await userEvent.type(returns, "-5")
    await userEvent.tab()
    await expect(returns).toHaveAttribute("aria-invalid", "true")
    await expect(returns).toHaveAttribute("aria-errormessage")
    await expect(returns).toHaveAccessibleDescription(
      "Enter a whole number of zero or more."
    )
    await userEvent.clear(returns)
    await userEvent.type(returns, "30")
    await userEvent.tab()
    await expect(returns).not.toHaveAttribute("aria-invalid", "true")
    await userEvent.click(canvas.getByRole("tab", { name: "General" }))
    await expectSelectedIndicator("General")
  },

  parameters: {
    docs: {
      description: {
        story:
          "Explore responsive workspace settings, validated saving and confirmed member removal using local demo state.",
      },
    },
  },

  name: "Vertical tab navigation",
  render: () => <SettingsPage />,
}
