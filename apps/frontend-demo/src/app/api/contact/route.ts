import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { Resend } from "resend"

import { ContactFormEmail } from "@/components/emails/contact-form-email"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const hasTrimmedString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const readOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined

const readEnv = (value: string | undefined, fallback: string): string =>
  hasTrimmedString(value) ? value : fallback

const { CONTACT_EMAIL, RESEND_API_KEY, RESEND_FROM_EMAIL } = process.env
const contactEmail = readEnv(CONTACT_EMAIL, "your-email@example.com")
const fromEmail = readEnv(RESEND_FROM_EMAIL, "onboarding@resend.dev")

const handleContactRequest = async (
  req: NextRequest,
): Promise<NextResponse> => {
  try {
    const body: unknown = await req.json()

    // Validate required fields
    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
    }

    const { firstName, lastName, email, phone, subject, message } = body

    if (
      !(
        hasTrimmedString(firstName) &&
        hasTrimmedString(lastName) &&
        hasTrimmedString(email) &&
        hasTrimmedString(message)
      )
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
    }

    const apiKey = RESEND_API_KEY

    if (!hasTrimmedString(apiKey)) {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 },
      )
    }

    const resend = new Resend(apiKey)
    const emailSubject = readOptionalString(subject) ?? ""
    const phoneNumber = readOptionalString(phone)

    // Send email
    const { data, error } = await resend.emails.send({
      from: `Kontaktní formulář <${fromEmail}>`,
      react: ContactFormEmail({
        email,
        firstName,
        lastName,
        message,
        ...(phoneNumber === undefined ? {} : { phone: phoneNumber }),
        subject: emailSubject,
      }),
      subject: `Nová zpráva z kontaktního formuláře: ${emailSubject}`,
      to: [contactEmail],
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      )
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

export { handleContactRequest as POST }
