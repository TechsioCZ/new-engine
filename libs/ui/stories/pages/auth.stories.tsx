import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Link } from "../../src/atoms/link"
import { StatusText } from "../../src/atoms/status-text"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { FormInput } from "../../src/molecules/form-input"
import { Toaster, useToast } from "../../src/molecules/toast"
import { Brand } from "./frame"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/System/Sign in",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Authentication screens. Short, centred, and free of anything that could",
          "distract from the single task.",
          "",
          "**Pattern rules**",
          "- One column, capped width, vertically centred. A full-width form for two",
          "  fields makes the fields look optional.",
          "- Errors are specific about what to do but never about which half of the",
          "  credentials was wrong — that is an account-enumeration leak.",
          "- The alternative paths (SSO, magic link, reset) are visible but visually",
          "  quieter than the primary submit.",
          "- Two-factor gets its own screen, not a third field: it arrives after the",
          "  password is accepted, and mixing them confuses every password manager.",
          "- The split variant is for products that sell as they sign in; the form half",
          "  stays identical, so there is one implementation.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

function SignInForm({ error }: { error?: boolean }) {
  const toaster = useToast()

  return (
    <div className="flex w-full max-w-md flex-col gap-250">
      <div className="flex flex-col gap-100">
        <h1 className="font-semibold text-xl">Sign in</h1>
        <p className="text-fg-secondary text-sm">
          Use your Northwind Commerce workspace account.
        </p>
      </div>

      {error && (
        <StatusText showIcon status="error">
          We couldn't sign you in with those details. Check them and try again,
          or reset your password.
        </StatusText>
      )}

      <form
        className="flex flex-col gap-200"
        onSubmit={(event) => {
          event.preventDefault()
          toaster.create({ type: "info", title: "Checking credentials…" })
        }}
      >
        <FormInput
          autoComplete="email"
          id="auth-email"
          label="Work email"
          required
          type="email"
          validateStatus={error ? "error" : "default"}
        />
        <FormInput
          autoComplete="current-password"
          id="auth-password"
          label="Password"
          required
          type="password"
          validateStatus={error ? "error" : "default"}
        />
        <div className="flex items-center justify-between gap-150">
          <FormCheckbox label="Keep me signed in" size="sm" />
          <Link href="#">Forgot password?</Link>
        </div>
        <Button block type="submit" variant="primary">
          Sign in
        </Button>
      </form>

      <div className="flex items-center gap-150">
        <span className="h-px flex-1 bg-border-primary" />
        <span className="text-fg-secondary text-xs">or</span>
        <span className="h-px flex-1 bg-border-primary" />
      </div>

      <div className="flex flex-col gap-150">
        <Button block icon="icon-[mdi--microsoft]" theme="outlined" variant="secondary">
          Continue with Microsoft Entra
        </Button>
        <Button block icon="icon-[mdi--email-outline]" theme="outlined" variant="secondary">
          Email me a sign-in link
        </Button>
      </div>

      <p className="text-fg-secondary text-xs">
        By signing in you accept the acceptable-use policy. Sessions expire after
        12 hours of inactivity.
      </p>
    </div>
  )
}

export const Centered: Story = {
  name: "Centered",
  render: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-350 bg-base p-250 text-fg-primary">
      <Toaster />
      <Brand environment="Admin" />
      <SignInForm />
    </div>
  ),
}

export const WithError: Story = {
  name: "Failed attempt",
  parameters: {
    docs: {
      description: {
        story:
          "One message covers both fields. Saying “no account with that email” would let anyone test which addresses are registered.",
      },
    },
  },
  render: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-350 bg-base p-250 text-fg-primary">
      <Toaster />
      <Brand environment="Admin" />
      <SignInForm error />
    </div>
  ),
}

export const TwoFactor: Story = {
  name: "Two-factor step",
  render: function Render() {
    const [code, setCode] = useState("")

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-350 bg-base p-250 text-fg-primary">
        <Brand environment="Admin" />
        <div className="flex w-full max-w-md flex-col gap-250">
          <div className="flex flex-col gap-100">
            <h1 className="font-semibold text-xl">Enter your code</h1>
            <p className="text-fg-secondary text-sm">
              We sent a six-digit code to the authenticator app on your device.
              It expires in 5 minutes.
            </p>
          </div>
          <FormInput
            autoComplete="one-time-code"
            helpText="Six digits, no spaces."
            id="auth-otp"
            inputMode="numeric"
            label="Verification code"
            onChange={(event) => setCode(event.target.value)}
            required
            value={code}
          />
          <FormCheckbox
            label="Trust this device for 30 days"
            size="sm"
          />
          <Button block disabled={!/^\d{6}$/.test(code)} variant="primary">
            Verify
          </Button>
          <div className="flex items-center justify-between gap-150">
            <Button size="sm" theme="borderless" variant="secondary">
              Use a recovery code
            </Button>
            <Button size="sm" theme="borderless" variant="secondary">
              Resend code
            </Button>
          </div>
        </div>
      </div>
    )
  },
}

export const Split: Story = {
  name: "Split with brand panel",
  parameters: {
    docs: {
      description: {
        story:
          "Marketing on one half, the same form on the other. The panel drops entirely below `lg` rather than stacking above the form and pushing it off screen.",
      },
    },
  },
  render: () => (
    <div className="flex min-h-screen bg-base text-fg-primary">
      <Toaster />
      <section className="hidden w-1/2 flex-col justify-between bg-surface p-350 lg:flex">
        <Brand environment="Admin" />
        <div className="flex flex-col gap-200">
          <Badge size="sm" variant="outline">
            Release 2026.9
          </Badge>
          <h2 className="max-w-prose font-semibold text-2xl">
            One admin for catalogue, orders and content.
          </h2>
          <ul className="flex flex-col gap-150">
            <li className="flex items-center gap-150 text-sm">
              <Icon icon="icon-[mdi--check-circle-outline]" size="md" />
              Inline grid editing across every collection
            </li>
            <li className="flex items-center gap-150 text-sm">
              <Icon icon="icon-[mdi--check-circle-outline]" size="md" />
              Brand theming without a rebuild
            </li>
            <li className="flex items-center gap-150 text-sm">
              <Icon icon="icon-[mdi--check-circle-outline]" size="md" />
              Audit trail on every destructive action
            </li>
          </ul>
        </div>
        <p className="text-fg-secondary text-xs">
          © 2026 Northwind Commerce · status.northwind.example
        </p>
      </section>
      <section className="flex flex-1 items-center justify-center p-250">
        <SignInForm />
      </section>
    </div>
  ),
}
