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
} from "@react-email/components"

type ForgotPasswordEmailProps = {
  reset_url: string
  store_name?: string
}

export function ForgotPasswordEmail({
  reset_url,
  store_name,
}: ForgotPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-900">
          <Container className="mx-auto my-10 max-w-2xl rounded-xl bg-white px-8 py-10">
            <Heading className="m-0 mb-6 text-center font-semibold text-2xl text-gray-950">
              Forgot your password?
            </Heading>

            <Text className="mb-4 text-base text-gray-700 leading-7">
              We received a request to reset your password for{" "}
              {store_name ?? "your account"}.
            </Text>

            <Text className="mb-8 text-base text-gray-700 leading-7">
              Click the button below to choose a new password. If you did not
              request this, you can safely ignore this email.
            </Text>

            <Section className="mb-8 text-center">
              <Button
                className="rounded-lg bg-black px-6 py-3 text-center font-semibold text-sm text-white no-underline"
                href={reset_url}
              >
                Reset password
              </Button>
            </Section>

            <Text className="mb-2 text-gray-500 text-sm leading-6">
              If the button does not work, copy and paste this link into your
              browser:
            </Text>

            <Text className="break-all text-gray-600 text-sm leading-6">
              {reset_url}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

ForgotPasswordEmail.PreviewProps = {
  reset_url:
    "http://localhost:3000/reset-password?token=demo&email=user@example.com",
  store_name: "Demo Store",
} satisfies ForgotPasswordEmailProps

export default ForgotPasswordEmail
