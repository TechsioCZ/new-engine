import { defineRouteConfig } from "@medusajs/admin-sdk"
import { EnvelopeContent } from "@medusajs/icons"
import { Button, Container, Drawer, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type EmailLog = {
  id: string
  email_id: string
  customer_id: string | null
  order_id: string | null
  type: string
  subject: string
  sent_to: string
  sent_at: string
  checked_at: string | null
  created_at: string
  updated_at: string
}

type EmailLogsResponse = {
  email_logs: EmailLog[]
  count: number
  limit: number
  offset: number
}

type ResendEmail = {
  id?: string
  from?: string
  to?: string | string[]
  subject?: string
  html?: string
  text?: string
  created_at?: string
  last_event?: string
  [key: string]: unknown
}

type EmailLogDetailResponse = {
  email_log: EmailLog
  resend_email: ResendEmail | null
}

const PAGE_SIZE = 20

export const handle = {
  breadcrumb: () => "Emails",
}

const formatDate = (date: string | null) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const formatRecipient = (recipient: string | string[] | undefined) => {
  if (!recipient) {
    return "-"
  }

  return Array.isArray(recipient) ? recipient.join(", ") : recipient
}

const getTextContent = (resendEmail: ResendEmail | null | undefined) => {
  if (!resendEmail) {
    return null
  }

  if (typeof resendEmail.text === "string" && resendEmail.text.trim()) {
    return resendEmail.text
  }

  return null
}

const getHtmlContent = (resendEmail: ResendEmail | null | undefined) => {
  if (!resendEmail) {
    return null
  }

  if (typeof resendEmail.html === "string" && resendEmail.html.trim()) {
    return resendEmail.html
  }

  return null
}

const DetailField = ({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) => (
  <div className="grid grid-cols-[120px_1fr] gap-3">
    <Text className="text-ui-fg-subtle" size="small">
      {label}
    </Text>
    <Text className="break-words" size="small">
      {value ?? "-"}
    </Text>
  </div>
)

const EmailRows = ({
  emailLogs,
  isLoading,
  onOpen,
}: {
  emailLogs: EmailLog[]
  isLoading: boolean
  onOpen: (id: string) => void
}) => {
  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>Loading...</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (!emailLogs.length) {
    return (
      <Table.Row>
        <Table.Cell>No emails logged yet.</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return emailLogs.map((emailLog) => (
    <Table.Row key={emailLog.id}>
      <Table.Cell className="whitespace-nowrap">
        {formatDate(emailLog.sent_at)}
      </Table.Cell>
      <Table.Cell className="max-w-[240px] truncate">
        {emailLog.sent_to}
      </Table.Cell>
      <Table.Cell className="whitespace-nowrap">{emailLog.type}</Table.Cell>
      <Table.Cell className="max-w-[320px] truncate">
        {emailLog.subject}
      </Table.Cell>
      <Table.Cell className="max-w-[180px] truncate">
        {emailLog.customer_id ?? "-"}
      </Table.Cell>
      <Table.Cell className="max-w-[180px] truncate">
        {emailLog.order_id ?? "-"}
      </Table.Cell>
      <Table.Cell className="text-right">
        <Button
          onClick={() => onOpen(emailLog.id)}
          size="small"
          type="button"
          variant="secondary"
        >
          Open
        </Button>
      </Table.Cell>
    </Table.Row>
  ))
}

const EmailDetailContent = ({
  detail,
  error,
  isLoading,
}: {
  detail: EmailLogDetailResponse | undefined
  error: unknown
  isLoading: boolean
}) => {
  if (isLoading) {
    return <Text>Loading...</Text>
  }

  if (error) {
    return (
      <Text className="text-ui-fg-error">Failed to load email detail.</Text>
    )
  }

  if (!detail) {
    return null
  }

  const resendEmail = detail.resend_email
  const htmlContent = getHtmlContent(resendEmail)
  const textContent = getTextContent(resendEmail)

  return (
    <>
      <div className="flex flex-col gap-3">
        <DetailField label="Email ID" value={detail.email_log.email_id} />
        <DetailField label="Customer" value={detail.email_log.customer_id} />
        <DetailField label="Order" value={detail.email_log.order_id} />
        <DetailField label="Type" value={detail.email_log.type} />
        <DetailField
          label="Subject"
          value={resendEmail?.subject ?? detail.email_log.subject}
        />
        <DetailField label="From" value={resendEmail?.from} />
        <DetailField
          label="To"
          value={formatRecipient(resendEmail?.to) ?? detail.email_log.sent_to}
        />
        <DetailField
          label="Sent"
          value={formatDate(detail.email_log.sent_at)}
        />
        <DetailField label="Last event" value={resendEmail?.last_event} />
      </div>

      {htmlContent ? (
        <div className="flex flex-col gap-2">
          <Heading level="h2">HTML</Heading>
          <iframe
            className="h-[560px] w-full rounded border bg-ui-bg-base"
            sandbox=""
            srcDoc={htmlContent}
            title="Email HTML content"
          />
        </div>
      ) : null}

      {textContent ? (
        <div className="flex flex-col gap-2">
          <Heading level="h2">Text</Heading>
          <pre className="txt-small whitespace-pre-wrap rounded border bg-ui-bg-subtle p-4 text-ui-fg-base">
            {textContent}
          </pre>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Heading level="h2">Resend Payload</Heading>
        <pre className="txt-small max-h-[360px] overflow-auto rounded border bg-ui-bg-subtle p-4 text-ui-fg-base">
          {JSON.stringify(resendEmail, null, 2)}
        </pre>
      </div>
    </>
  )
}

const EmailsPage = () => {
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedEmailLogId, setSelectedEmailLogId] = useState<string | null>(
    null
  )

  const offset = pageIndex * PAGE_SIZE

  const { data, isLoading, error } = useQuery({
    queryFn: () =>
      sdk.client.fetch<EmailLogsResponse>(
        `/admin/email-logs?limit=${PAGE_SIZE}&offset=${offset}`
      ),
    queryKey: ["email-logs", PAGE_SIZE, offset],
  })

  const detailQuery = useQuery({
    enabled: !!selectedEmailLogId,
    queryFn: () =>
      sdk.client.fetch<EmailLogDetailResponse>(
        `/admin/email-logs/${selectedEmailLogId}`
      ),
    queryKey: ["email-log", selectedEmailLogId],
  })

  const emailLogs = data?.email_logs ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h1">Emails</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {count} logged emails
            </Text>
          </div>
        </div>

        {error ? (
          <div className="px-6 py-4">
            <Text className="text-ui-fg-error">Failed to load email logs.</Text>
          </div>
        ) : (
          <>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Sent</Table.HeaderCell>
                  <Table.HeaderCell>To</Table.HeaderCell>
                  <Table.HeaderCell>Type</Table.HeaderCell>
                  <Table.HeaderCell>Subject</Table.HeaderCell>
                  <Table.HeaderCell>Customer</Table.HeaderCell>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell className="w-[1%] text-right">
                    Detail
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <EmailRows
                  emailLogs={emailLogs}
                  isLoading={isLoading}
                  onOpen={setSelectedEmailLogId}
                />
              </Table.Body>
            </Table>

            <Table.Pagination
              canNextPage={pageIndex + 1 < pageCount}
              canPreviousPage={pageIndex > 0}
              count={count}
              nextPage={() => setPageIndex((current) => current + 1)}
              pageCount={pageCount}
              pageIndex={pageIndex}
              pageSize={PAGE_SIZE}
              previousPage={() =>
                setPageIndex((current) => Math.max(current - 1, 0))
              }
            />
          </>
        )}
      </Container>

      <Drawer
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEmailLogId(null)
          }
        }}
        open={!!selectedEmailLogId}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Email Detail</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
            <EmailDetailContent
              detail={detailQuery.data}
              error={detailQuery.error}
              isLoading={detailQuery.isLoading}
            />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </>
  )
}

export const config = defineRouteConfig({
  icon: EnvelopeContent,
  label: "Emails",
})

export default EmailsPage
