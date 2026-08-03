import type { CSSProperties, ReactNode } from "react"

interface ContactFormEmailProps {
  firstName: string
  lastName: string
  email: string
  phone?: string
  subject: string
  message: string
}

export const ContactFormEmail = ({
  firstName,
  lastName,
  email,
  phone,
  subject,
  message,
}: ContactFormEmailProps) => {
  const previewText = `Nová zpráva od ${firstName} ${lastName}`

  return (
    <html lang="cs">
      <body style={styles.body}>
        <div style={styles.preview}>{previewText}</div>
        <main style={styles.container}>
          <h1 style={styles.heading}>Nová zpráva z kontaktního formuláře</h1>
          <EmailField label="Jméno">
            {firstName} {lastName}
          </EmailField>
          <EmailField label="Email">
            <a href={`mailto:${email}`} style={styles.link}>
              {email}
            </a>
          </EmailField>
          {phone ? <EmailField label="Telefon">{phone}</EmailField> : null}
          <EmailField label="Téma">{getSubjectLabel(subject)}</EmailField>
          <hr style={styles.divider} />
          <section style={styles.section}>
            <p style={styles.label}>Zpráva:</p>
            <p style={styles.message}>{message}</p>
          </section>
          <hr style={styles.divider} />
          <p style={styles.footer}>
            Tato zpráva byla odeslána prostřednictvím kontaktního formuláře na
            webu.
          </p>
        </main>
      </body>
    </html>
  )
}

ContactFormEmail.PreviewProps = {
  firstName: "Jan",
  lastName: "Novák",
  email: "jan.novak@example.com",
  phone: "+420 123 456 789",
  subject: "general",
  message: "Dobrý den, rád bych se zeptal na dostupnost vašich produktů.",
} satisfies ContactFormEmailProps

function EmailField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <section style={styles.section}>
      <p style={styles.label}>{label}:</p>
      <p style={styles.value}>{children}</p>
    </section>
  )
}

function getSubjectLabel(subject: string): string {
  const subjects: Record<string, string> = {
    general: "Obecný dotaz",
    support: "Technická podpora",
    shipping: "Doprava a doručení",
    returns: "Vrácení zboží",
    other: "Jiné",
  }
  return subjects[subject] || subject
}

const styles = {
  body: {
    backgroundColor: "#f3f4f6",
    color: "#1f2937",
    fontFamily: "Arial, sans-serif",
    margin: 0,
    padding: "24px",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    margin: "0 auto",
    maxWidth: "640px",
    padding: "32px",
  },
  divider: {
    border: 0,
    borderTop: "1px solid #e5e7eb",
    margin: "24px 0",
  },
  footer: {
    color: "#6b7280",
    fontSize: "12px",
    margin: "32px 0 0",
    textAlign: "center",
  },
  heading: {
    color: "#111827",
    fontSize: "24px",
    margin: "0 0 32px",
    textAlign: "center",
  },
  label: {
    color: "#4b5563",
    fontSize: "14px",
    fontWeight: 600,
    margin: "0 0 4px",
  },
  link: {
    color: "#2563eb",
    textDecoration: "underline",
  },
  message: {
    fontSize: "16px",
    lineHeight: 1.6,
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  preview: {
    display: "none",
    maxHeight: 0,
    maxWidth: 0,
    opacity: 0,
    overflow: "hidden",
  },
  section: {
    margin: "0 0 16px",
  },
  value: {
    fontSize: "16px",
    margin: 0,
  },
} satisfies Record<string, CSSProperties>
