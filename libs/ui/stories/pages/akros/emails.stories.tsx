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
import { type EmailTemplate, emailTemplates, emailVariables } from "./data"
import { AkrosShell, akrosDocs } from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Customer emails",
  parameters: {
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
  return emailVariables.reduce(
    (result, variable) => result.split(variable.token).join(variable.sample),
    text
  )
}

const audienceLabels = { all: "All customers", B2C: "B2C", B2B: "B2B" }

function EmailsPage({ initialId }: { initialId?: string }) {
  const toaster = useToast()
  const [templates, setTemplates] = useState(emailTemplates)
  const [editingId, setEditingId] = useState(initialId)
  const editing = templates.find((template) => template.id === editingId)
  const [subject, setSubject] = useState(editing?.subject ?? "")
  const [body, setBody] = useState(
    editingId ? (bodies[editingId] ?? defaultBody) : defaultBody
  )

  const open = (template: EmailTemplate) => {
    setEditingId(template.id)
    setSubject(template.subject)
    setBody(bodies[template.id] ?? defaultBody)
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
                    title: "Test email sent",
                    description: "To nora.kessler@akros.cz with sample data.",
                  })
                }
                theme="outlined"
                variant="secondary"
              >
                Send test to me
              </Button>
              <Button
                onClick={() => {
                  setTemplates((current) =>
                    current.map((template) =>
                      template.id === editing.id
                        ? { ...template, subject, updatedAt: "2026-09-14" }
                        : template
                    )
                  )
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
          <Tabs defaultValue="edit" variant="line">
            <Tabs.List>
              <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
              <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
              <Tabs.Indicator />
            </Tabs.List>

            <Tabs.Content className="flex flex-col gap-200 pt-200" value="edit">
              <FormInput
                id="email-subject"
                label="Subject"
                onChange={(event) => setSubject(event.target.value)}
                required
                value={subject}
              />
              <FormTextarea
                id="email-body"
                label="Text"
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                value={body}
              />
              <div className="flex flex-col gap-100">
                <span className="font-medium text-sm">Variables</span>
                <Table size="sm" variant="line">
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
                          <code className="text-xs">{variable.token}</code>
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
              <div className="flex flex-col gap-100 rounded-md border border-border-primary p-200">
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
  name: "Email notifications",
  render: () => <EmailsPage />,
}

export const EditUnpaidReminder: Story = {
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
