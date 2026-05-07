import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components"

type OrderReceiptEmailProps = {
  customer_name?: string
  order_display_id: string
  store_name?: string
  total?: string
}

export function OrderReceiptEmail({
  customer_name,
  order_display_id,
  store_name,
  total,
}: OrderReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Potvrzení objednávky {order_display_id}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-900">
          <Container className="mx-auto my-10 max-w-2xl rounded-xl bg-white px-8 py-10">
            <Heading className="m-0 mb-6 text-center font-semibold text-2xl text-gray-950">
              Děkujeme za objednávku
            </Heading>

            <Text className="mb-4 text-base text-gray-700 leading-7">
              {customer_name ? `${customer_name}, ` : ""}potvrzujeme přijetí
              objednávky {order_display_id}
              {store_name ? ` v obchodě ${store_name}` : ""}.
            </Text>

            {total ? (
              <Text className="mb-4 text-base text-gray-700 leading-7">
                Celková částka: <strong>{total}</strong>
              </Text>
            ) : null}

            <Text className="mb-2 text-gray-600 text-sm leading-6">
              Fakturu k objednávce najdete v příloze tohoto emailu.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

OrderReceiptEmail.PreviewProps = {
  customer_name: "Jan Novak",
  order_display_id: "#1001",
  store_name: "Demo Store",
  total: "1 290 Kč",
} satisfies OrderReceiptEmailProps

export default OrderReceiptEmail
