import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test"
import { templateText } from "../page-models"
import { StatusText } from "../../../src/atoms/status-text"
import { DemoBoundary } from "../demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Dialog } from "../../../src/molecules/dialog"
import { FormInput } from "../../../src/molecules/form-input"
import { FormTextarea } from "../../../src/molecules/form-textarea"
import { Switch } from "../../../src/molecules/switch"
import { Tabs } from "../../../src/molecules/tabs"
import { Toaster, useToast } from "../../../src/molecules/toast"
import type { ColumnDef } from "../../../src/organisms/data-table"
import { DataTable } from "../../../src/organisms/data-table"
import { Table } from "../../../src/organisms/table"
import { PageHeader, SectionCard } from "../shell"
import {
  type EmailTemplate,
  emailTemplates,
  emailVariables,
  formatDate,
} from "./data"
import { AkrosShell, akrosDocs } from "./shared"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],

  tags: ["autodocs"],
  title: "Pages/Akros admin/Customer emails",
  parameters: {
    brandLock: "akros",
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Email communication**: the CMS manages the email",
          "notifications sent to customers.",
          "",
          "**How it is built** — `DataTable`, `Tabs`, `FormInput`, `FormTextarea`,",
          "`Switch`, `Table`, `Dialog`, `Toast`.",
          "",
          "**Pattern rules**",
          "- Every template states its trigger in plain words (*Comgate payment",
          "  cancelled or failed*), so nobody has to guess when an email goes out.",
          "- Turning a template off is a switch in the list; its consequence — the",
          "  customer gets nothing — is in the help text.",
          "- Variables are listed next to the editor with sample values, and the",
          "  preview renders the sample, so a typo in `{{order.number}}` shows up",
          "  before a customer sees it.",
          "- *Send test* goes to the operator's own address, never to a customer.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const bodies: Record<string, string> = {
  "em-unpaid": [
    "Dobrý den {{customer.first_name}},",
    "",
    "platba za objednávku {{order.number}} ve výši {{order.total}} nebyla dokončena.",
    "Zaplatit můžete tady: {{payment.link}}",
    "",
    "Zboží pro vás držíme 3 dny. Doprava: {{shipping.method}} ({{shipping.point_id}}).",
    "",
    "Tým Akros",
  ].join("\n"),
}

const defaultBody = [
  "Dobrý den {{customer.first_name}},",
  "",
  "děkujeme za objednávku {{order.number}} v hodnotě {{order.total}}.",
  "Doprava: {{shipping.method}} — {{shipping.point_name}}.",
  "",
  "Tým Akros",
].join("\n")

function render(text: string) {
  return templateText(text, emailVariables).rendered
}

const audienceLabels = { all: "All customers", B2C: "B2C", B2B: "B2B" }

function EmailsPage({ initialId }: { initialId?: string }) {
  const toaster = useToast()
  const [templates, setTemplates] = useState(emailTemplates)
  const [editingId, setEditingId] = useState(initialId)
  const editing = templates.find((template) => template.id === editingId)
  const [subject, setSubject] = useState(editing?.subject ?? "")
  const [savedBodies, setSavedBodies] = useState(bodies)
  const [body, setBody] = useState(
    editingId ? (bodies[editingId] ?? defaultBody) : defaultBody
  )

  const [attempted, setAttempted] = useState(false)
  const [tab, setTab] = useState("edit")
  const subjectTokens = templateText(subject, emailVariables).unknown
  const bodyTokens = templateText(body, emailVariables).unknown
  const subjectError =
    attempted && !subject.trim()
      ? "Enter a nonempty subject before saving."
      : subjectTokens.length
        ? `Unsupported variables: ${subjectTokens.join(", ")}. Use a token from the Variables reference.`
        : undefined
  const bodyError = bodyTokens.length
    ? `Unsupported variables: ${bodyTokens.join(", ")}. Use a token from the Variables reference.`
    : undefined
  const open = (template: EmailTemplate) => {
    setAttempted(false)
    setTab("edit")
    setEditingId(template.id)
    setSubject(template.subject)
    setBody(savedBodies[template.id] ?? defaultBody)
  }

  const columns = useMemo<ColumnDef<EmailTemplate, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Email",
        meta: { type: "string", width: 260 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.subject}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "trigger",
        header: "Sent when",
        meta: { type: "string", width: 260 },
      },
      {
        accessorKey: "audience",
        header: "To",
        meta: { type: "string", width: 130 },
        cell: (info) => audienceLabels[info.row.original.audience],
      },
      {
        accessorKey: "enabled",
        header: "Active",
        meta: { type: "boolean", width: 100 },
        cell: (info) => (
          <Switch
            checked={info.getValue<boolean>()}
            onCheckedChange={(checked) =>
              setTemplates((current) =>
                current.map((template) =>
                  template.id === info.row.original.id
                    ? { ...template, enabled: checked }
                    : template
                )
              )
            }
          >
            <span className="sr-only">{`Send “${info.row.original.name}”`}</span>
          </Switch>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        meta: { type: "date", width: 130 },
        cell: (info) => formatDate(info.getValue<string>()),
      },
    ],
    []
  )

  return (
    <AkrosShell expanded={["settings"]} selected="emails">
      <Toaster />

      <PageHeader
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Settings", href: "#" },
          { label: "Customer emails" },
        ]}
        description="Automatic emails the shop sends to customers. Sender: obchod@akros.cz."
        title="Customer emails"
      />

      <SectionCard flush>
        <DataTable
          columns={columns}
          data={templates}
          enableGlobalFilter
          enableSorting
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.original.name}
          rowActions={[
            {
              id: "edit",
              label: "Edit template",
              icon: "icon-[mdi--pencil-outline]",
              onAction: (row) => open(row.original),
            },
          ]}
          size="sm"
          translations={{ searchPlaceholder: "Search emails…" }}
        />
      </SectionCard>

      {editing && (
        <Dialog
          actions={
            <>
              <Button
                icon="icon-[mdi--email-send-outline]"
                onClick={() =>
                  toaster.create({
                    type: "info",
                    title: "Test delivery preview",
                    description:
                      "Sample recipient: nora.kessler@akros.cz. No email was sent from this demo.",
                  })
                }
                theme="outlined"
                variant="secondary"
              >
                Preview test delivery
              </Button>
              <Button
                onClick={() => {
                  setAttempted(true)
                  if (
                    !subject.trim() ||
                    subjectTokens.length ||
                    bodyTokens.length
                  ) {
                    setTab("edit")
                    requestAnimationFrame(() =>
                      document
                        .getElementById(
                          !subject.trim() || subjectTokens.length
                            ? "email-subject"
                            : "email-body"
                        )
                        ?.focus()
                    )
                    return
                  }
                  setTemplates((current) =>
                    current.map((template) =>
                      template.id === editing.id
                        ? {
                            ...template,
                            subject: subject.trim(),
                            updatedAt: "2026-09-14",
                          }
                        : template
                    )
                  )
                  setSavedBodies((current) => ({
                    ...current,
                    [editing.id]: body,
                  }))
                  setEditingId(undefined)
                  toaster.create({
                    type: "success",
                    title: `${editing.name} saved`,
                  })
                }}
                variant="primary"
              >
                Save template
              </Button>
            </>
          }
          customTrigger
          description={`Sent when: ${editing.trigger}`}
          onOpenChange={(details) => {
            if (!details.open) {
              setEditingId(undefined)
            }
          }}
          open
          placement="right"
          size="lg"
          title={editing.name}
        >
          <Tabs value={tab} onValueChange={setTab} variant="line">
            <Tabs.List>
              <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
              <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content className="flex flex-col gap-200 pt-200" value="edit">
              <FormInput
                id="email-subject"
                helpText={subjectError}
                validateStatus={subjectError ? "error" : "default"}
                label="Subject"
                onChange={(event) => setSubject(event.target.value)}
                required
                value={subject}
              />
              <FormTextarea
                id="email-body"
                helpText={bodyError}
                validateStatus={bodyError ? "error" : "default"}
                label="Text"
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                value={body}
              />
              <div
                role="region"
                aria-label="Supported email variables"
                tabIndex={0}
                className="min-w-0 max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus-ring"
              >
                <span className="font-medium text-sm">Variables</span>
                <Table className="min-w-xl" size="sm" variant="line">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Variable</Table.ColumnHeader>
                      <Table.ColumnHeader>Sample value</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {emailVariables.map((variable) => (
                      <Table.Row key={variable.token}>
                        <Table.Cell>
                          <code className="whitespace-nowrap text-xs">{variable.token}</code>
                        </Table.Cell>
                        <Table.Cell>{variable.sample}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </Tabs.Content>

            <Tabs.Content
              className="flex flex-col gap-150 pt-200"
              value="preview"
            >
              {(subjectError || bodyError) && (
                <StatusText status="error">
                  {[subjectError, bodyError].filter(Boolean).join(" ")} Open
                  Edit to correct the template and consult Variables.
                </StatusText>
              )}
              <div className="flex min-w-0 flex-col gap-100 rounded-md border border-border-primary p-200 wrap-anywhere">
                <span className="text-fg-secondary text-xs">
                  From obchod@akros.cz · to jana.prochazkova@email.cz
                </span>
                <span className="font-semibold text-md">{render(subject)}</span>
                <p className="whitespace-pre-line text-sm">{render(body)}</p>
              </div>
              {editing.audience !== "all" && (
                <Badge size="sm" variant="outline">
                  {`Only sent to ${audienceLabels[editing.audience]} customers`}
                </Badge>
              )}
            </Tabs.Content>
          </Tabs>
        </Dialog>
      )}
    </AkrosShell>
  )
}

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare default in emails to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Email notifications",
  render: () => <EmailsPage />,
}

export const EditUnpaidReminder: Story = {
  play: async ({ canvasElement }) => {
    for (const sample of [defaultBody, ...Object.values(bodies)]) {
      await expect(templateText(sample, emailVariables).unknown).toEqual([])
    }
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const dialog = within(body.getByRole("dialog"))
    const variables = dialog.getByRole("region", {
      name: "Supported email variables",
    })
    await expect(variables).toHaveAttribute("tabindex", "0")
    await expect(within(variables).getByRole("table")).toHaveClass("min-w-xl")
    for (const variable of emailVariables) {
      await expect(within(variables).getByText(variable.token)).toHaveClass(
        "whitespace-nowrap"
      )
    }
    const subject = dialog.getByLabelText(/Subject/)
    const original = (subject as HTMLInputElement).value
    await userEvent.clear(subject)
    await userEvent.type(subject, "   ")
    await userEvent.click(dialog.getByRole("button", { name: "Save template" }))
    await expect(subject).toHaveAttribute("aria-invalid", "true")
    await waitFor(() => expect(subject).toHaveFocus())
    await userEvent.clear(subject)
    fireEvent.change(subject, {
      target: { value: "Unknown {{unknown.token}}" },
    })
    await userEvent.click(dialog.getByRole("tab", { name: "Preview" }))
    await expect(
      dialog.getByText(/Open Edit to correct the template/)
    ).toBeVisible()
    await userEvent.click(dialog.getByRole("button", { name: "Save template" }))
    await waitFor(() => expect(subject).toHaveFocus())
    await userEvent.clear(subject)
    fireEvent.change(subject, { target: { value: original } })
    await userEvent.click(dialog.getByRole("button", { name: "Save template" }))
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await expect(
      canvas.getByRole("heading", { name: "Customer emails" })
    ).toBeVisible()
  },
  name: "Edit the unpaid-payment email",
  parameters: {
    docs: {
      description: {
        story:
          "The email Comgate failures trigger. Edit the text on the first tab, check the rendered sample on *Preview*, and send a test to yourself.",
      },
    },
  },
  render: () => <EmailsPage initialId="em-unpaid" />,
}
