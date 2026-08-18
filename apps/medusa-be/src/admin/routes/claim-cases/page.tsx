import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ExclamationCircle } from "@medusajs/icons"
import { Button, Container, Drawer, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type ClaimItem = {
  id: string
  quantity: number
  title: string
}

type ClaimCase = {
  id: string
  case_number: string
  customer_id: string | null
  defect_description: string | null
  email: string
  items?: ClaimItem[]
  order_display_id: string | null
  order_id: string | null
  purchase_details: string | null
  reason: string | null
  requested_resolution: string | null
  status: string
  submitted_at: string
  type: string
}

type ClaimCasesResponse = {
  claim_cases: ClaimCase[]
  count: number
  limit: number
  offset: number
}

type ClaimCaseResponse = { claim_case: ClaimCase }

const PAGE_SIZE = 20

export const handle = {
  breadcrumb: () => "Claims & returns",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatType(value: string) {
  return value === "complaint" ? "Complaint" : "Return"
}

function DetailField({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <Text className="text-ui-fg-subtle" size="small">
        {label}
      </Text>
      <Text className="break-words" size="small">
        {value || "-"}
      </Text>
    </div>
  )
}

function ClaimRows({
  cases,
  isLoading,
  onOpen,
}: {
  cases: ClaimCase[]
  isLoading: boolean
  onOpen: (id: string) => void
}) {
  if (isLoading || cases.length === 0) {
    return (
      <Table.Row>
        <Table.Cell>{isLoading ? "Loading..." : "No claims yet."}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return cases.map((claimCase) => (
    <Table.Row key={claimCase.id}>
      <Table.Cell className="font-medium">{claimCase.case_number}</Table.Cell>
      <Table.Cell>{formatType(claimCase.type)}</Table.Cell>
      <Table.Cell>{claimCase.status}</Table.Cell>
      <Table.Cell>{claimCase.email}</Table.Cell>
      <Table.Cell>{claimCase.order_display_id ?? "Manual"}</Table.Cell>
      <Table.Cell>{formatDate(claimCase.submitted_at)}</Table.Cell>
      <Table.Cell className="text-right">
        <Button
          onClick={() => onOpen(claimCase.id)}
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

function ClaimDetail({ claimCase }: { claimCase: ClaimCase }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <DetailField label="Case number" value={claimCase.case_number} />
        <DetailField label="Type" value={formatType(claimCase.type)} />
        <DetailField label="Status" value={claimCase.status} />
        <DetailField
          label="Submitted"
          value={formatDate(claimCase.submitted_at)}
        />
        <DetailField label="Email" value={claimCase.email} />
        <DetailField label="Order" value={claimCase.order_display_id} />
        <DetailField
          label="Resolution"
          value={claimCase.requested_resolution}
        />
        <DetailField label="Reason" value={claimCase.reason} />
        <DetailField label="Defect" value={claimCase.defect_description} />
        <DetailField
          label="Purchase details"
          value={claimCase.purchase_details}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Text size="small" weight="plus">
          Items
        </Text>
        {(claimCase.items ?? []).map((item) => (
          <div
            className="flex items-center justify-between rounded-md bg-ui-bg-subtle px-4 py-3"
            key={item.id}
          >
            <Text size="small">{item.title}</Text>
            <Text className="text-ui-fg-subtle" size="small">
              {item.quantity} pcs
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClaimDetailContent({
  data,
  isLoading,
}: {
  data?: ClaimCaseResponse
  isLoading: boolean
}) {
  if (isLoading) {
    return <Text>Loading...</Text>
  }
  if (!data) {
    return (
      <Text className="text-ui-fg-error">Failed to load claim detail.</Text>
    )
  }
  return <ClaimDetail claimCase={data.claim_case} />
}

const ClaimCasesPage = () => {
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const offset = pageIndex * PAGE_SIZE
  const listQuery = useQuery({
    queryFn: () =>
      sdk.client.fetch<ClaimCasesResponse>(
        `/admin/claim-cases?limit=${PAGE_SIZE}&offset=${offset}`
      ),
    queryKey: ["claim-cases", PAGE_SIZE, offset],
  })
  const detailQuery = useQuery({
    enabled: Boolean(selectedId),
    queryFn: () =>
      sdk.client.fetch<ClaimCaseResponse>(`/admin/claim-cases/${selectedId}`),
    queryKey: ["claim-case", selectedId],
  })
  const count = listQuery.data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  return (
    <>
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Claims & returns</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {count} submitted cases
          </Text>
        </div>
        {listQuery.error ? (
          <Text className="px-6 py-4 text-ui-fg-error">
            Failed to load claims.
          </Text>
        ) : (
          <>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Case</Table.HeaderCell>
                  <Table.HeaderCell>Type</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Email</Table.HeaderCell>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Submitted</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">
                    Detail
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <ClaimRows
                  cases={listQuery.data?.claim_cases ?? []}
                  isLoading={listQuery.isLoading}
                  onOpen={setSelectedId}
                />
              </Table.Body>
            </Table>
            <Table.Pagination
              canNextPage={pageIndex + 1 < pageCount}
              canPreviousPage={pageIndex > 0}
              count={count}
              nextPage={() => setPageIndex((value) => value + 1)}
              pageCount={pageCount}
              pageIndex={pageIndex}
              pageSize={PAGE_SIZE}
              previousPage={() =>
                setPageIndex((value) => Math.max(value - 1, 0))
              }
            />
          </>
        )}
      </Container>
      <Drawer
        onOpenChange={(open) => !open && setSelectedId(null)}
        open={Boolean(selectedId)}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Claim detail</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <ClaimDetailContent
              data={detailQuery.data}
              isLoading={detailQuery.isLoading}
            />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </>
  )
}

export const config = defineRouteConfig({
  icon: ExclamationCircle,
  label: "Claims & returns",
})

export default ClaimCasesPage
