import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../lib/sdk"

type PaymentReminderOrder = {
  id: string
  display_id: number
  order_display_id: string
  email: string | null
  customer_id: string | null
  payment_status: string | null
  status: string | null
  total_formatted?: string
}

type UnpaidOrdersResponse = {
  orders: PaymentReminderOrder[]
}

type OrderEmailTemplate = {
  label: string
  subject: string
  template: string
  trigger_type: string
}

type OrderEmailTemplatesResponse = {
  templates: OrderEmailTemplate[]
}

type OrderEmailResponse = {
  order: PaymentReminderOrder
  sent: boolean
  template: OrderEmailTemplate
}

type OrderPaymentReminderWidgetProps = Partial<DetailWidgetProps<AdminOrder>>

const UNPAID_ORDERS_QUERY_KEY = ["unpaid-orders-payment-reminders"]
const ORDER_EMAIL_TEMPLATES_QUERY_KEY = ["order-email-templates"]
const DEFAULT_ORDER_EMAIL_TEMPLATE = "order-payment-reminder"

const sendOrderEmail = ({
  orderId,
  template,
}: {
  orderId: string
  template: string
}) =>
  sdk.client.fetch<OrderEmailResponse>(`/admin/orders/${orderId}/email`, {
    body: {
      template,
    },
    method: "POST",
  })

const getOrderLabel = (order: PaymentReminderOrder | AdminOrder) => {
  if ("order_display_id" in order && order.order_display_id) {
    return order.order_display_id
  }

  return `#${order.display_id}`
}

const OrderEmailSendControl = ({
  disabled,
  orderId,
  templates,
}: {
  disabled?: boolean
  orderId: string
  templates: OrderEmailTemplate[]
}) => {
  const queryClient = useQueryClient()
  const [template, setTemplate] = useState(
    templates[0]?.template ?? DEFAULT_ORDER_EMAIL_TEMPLATE
  )
  const mutation = useMutation({
    mutationFn: () => sendOrderEmail({ orderId, template }),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to send order email"
      )
    },
    onSuccess: (response) => {
      toast.success(`${response.template.label} sent`)
      queryClient.invalidateQueries({ queryKey: UNPAID_ORDERS_QUERY_KEY })
    },
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <Select onValueChange={setTemplate} value={template}>
        <Select.Trigger className="w-[180px]">
          <Select.Value placeholder="Select email" />
        </Select.Trigger>
        <Select.Content>
          {templates.map((item) => (
            <Select.Item key={item.template} value={item.template}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      <Button
        disabled={disabled || !templates.length}
        isLoading={mutation.isPending}
        onClick={() => mutation.mutate()}
        size="small"
        type="button"
        variant="secondary"
      >
        Send
      </Button>
    </div>
  )
}

const DetailReminderWidget = ({ order }: { order: AdminOrder }) => {
  const { data } = useQuery({
    queryFn: () =>
      sdk.client.fetch<OrderEmailTemplatesResponse>(
        "/admin/orders/email-templates"
      ),
    queryKey: ORDER_EMAIL_TEMPLATES_QUERY_KEY,
  })
  const templates = data?.templates ?? []

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-6 py-4">
        <div>
          <Heading level="h2">Order email</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Send an order email to {order.email ?? "customer"}.
          </Text>
        </div>
        <OrderEmailSendControl
          disabled={!order.email}
          orderId={order.id}
          templates={templates}
        />
      </div>
    </Container>
  )
}

const ListReminderWidget = () => {
  const {
    data,
    error: loadError,
    isLoading,
  } = useQuery({
    queryFn: () =>
      sdk.client.fetch<UnpaidOrdersResponse>(
        "/admin/orders/payment-reminders/unpaid?limit=5"
      ),
    queryKey: UNPAID_ORDERS_QUERY_KEY,
  })
  const templatesQuery = useQuery({
    queryFn: () =>
      sdk.client.fetch<OrderEmailTemplatesResponse>(
        "/admin/orders/email-templates"
      ),
    queryKey: ORDER_EMAIL_TEMPLATES_QUERY_KEY,
  })

  const orders = data?.orders ?? []
  const templates = templatesQuery.data?.templates ?? []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Order emails</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Unpaid orders ready for a manual email.
          </Text>
        </div>
      </div>

      {loadError ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Failed to load unpaid orders.
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Order</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
              <Table.HeaderCell className="w-[1%] text-right">
                Send
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <Table.Cell>Loading...</Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            ) : null}
            {isLoading || orders.length ? null : (
              <Table.Row>
                <Table.Cell>No unpaid orders found.</Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            )}
            {orders.map((order) => (
              <Table.Row key={order.id}>
                <Table.Cell className="whitespace-nowrap">
                  {getOrderLabel(order)}
                </Table.Cell>
                <Table.Cell className="max-w-[280px] truncate">
                  {order.email ?? "-"}
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  {order.payment_status ?? "-"}
                </Table.Cell>
                <Table.Cell className="whitespace-nowrap">
                  {order.total_formatted ?? "-"}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <OrderEmailSendControl
                    disabled={!order.email}
                    orderId={order.id}
                    templates={templates}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

const OrderPaymentReminderWidget = ({
  data,
}: OrderPaymentReminderWidgetProps) => {
  if (data?.id) {
    return <DetailReminderWidget order={data} />
  }

  return <ListReminderWidget />
}

export const config = defineWidgetConfig({
  zone: ["order.list.before", "order.details.side.before"],
})

export default OrderPaymentReminderWidget
