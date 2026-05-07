import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { ContactFormEmail } from "@/components/emails/contact-form-email"

const contactEmail = process.env.CONTACT_EMAIL || "your-email@example.com"
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, phone, subject, message } = body

    // Validate required fields
    if (!(firstName && lastName && email && message)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service is not configured" },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send email
    const { data, error } = await resend.emails.send({
      from: `Kontaktní formulář <${fromEmail}>`,
      to: [contactEmail],
      subject: `Nová zpráva z kontaktního formuláře: ${subject}`,
      react: ContactFormEmail({
        firstName,
        lastName,
        email,
        phone,
        subject,
        message,
      }),
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
