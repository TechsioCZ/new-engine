import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email"

type OrderPaymentReminderEmailProps = {
  order_display_id: string
  payment_url: string
  store_name?: string
  total?: string
}

export function OrderPaymentReminderEmail({
  order_display_id,
  payment_url,
  store_name,
  total,
}: OrderPaymentReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Zaplaťte objednávku {order_display_id}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-900">
          <Container className="mx-auto my-10 max-w-2xl rounded-xl bg-white px-8 py-10">
            <Heading className="m-0 mb-6 text-center font-semibold text-2xl text-gray-950">
              Objednávka čeká na zaplacení
            </Heading>

            <Text className="mb-4 text-base text-gray-700 leading-7">
              Vaše objednávka {order_display_id}
              {store_name ? ` v obchodě ${store_name}` : ""} zatím není
              zaplacená.
            </Text>

            {total ? (
              <Text className="mb-4 text-base text-gray-700 leading-7">
                Částka k úhradě: <strong>{total}</strong>
              </Text>
            ) : null}

            <Section className="mb-8 text-center">
              <Button
                className="rounded-lg bg-black px-6 py-3 text-center font-semibold text-sm text-white no-underline"
                href={payment_url}
              >
                Zaplatit objednávku
              </Button>
            </Section>

            <Text className="mb-2 text-gray-500 text-sm leading-6">
              Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
            </Text>

            <Text className="break-all text-gray-600 text-sm leading-6">
              {payment_url}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

OrderPaymentReminderEmail.PreviewProps = {
  order_display_id: "#1001",
  payment_url: "http://localhost:8000/orders/order_123",
  store_name: "Demo Store",
  total: "1 290 Kč",
} satisfies OrderPaymentReminderEmailProps

export default OrderPaymentReminderEmail
