import { expect, userEvent, within } from "storybook/test"
import { DemoBoundary } from "./demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Link } from "../../src/atoms/link"
import { StatusText } from "../../src/atoms/status-text"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import { FormInput } from "../../src/molecules/form-input"
import { Toaster } from "../../src/molecules/toast"
import { Brand } from "./frame"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],
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

function SignInForm({ error = false }: { error?: boolean }) {
  const id = useId()
  const [failed, setFailed] = useState(error)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [recovery, setRecovery] = useState(false)
  const [recoveryRequested, setRecoveryRequested] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const errorId = `${id}-error`

  if (signedIn)
    return (
      <section className="flex w-full max-w-md flex-col gap-200">
        <h1 className="font-semibold text-xl">Demo workspace</h1>
        <StatusText status="success">
          Local demo session opened for {email}. No account service was
          contacted.
        </StatusText>
        <Button
          variant="secondary"
          onClick={() => {
            setSignedIn(false)
            setPassword("")
          }}
        >
          Sign out of demo
        </Button>
      </section>
    )

  return (
    <div className="flex w-full max-w-md flex-col gap-250">
      <div className="flex flex-col gap-100">
        <h1 className="font-semibold text-xl">
          {recovery ? "Recover access" : "Sign in"}
        </h1>
        <p className="text-fg-secondary text-sm">
          Local prototype. Use demo@northwind.example and the password
          northwind-demo; never enter real credentials.
        </p>
      </div>
      {failed && !recovery && (
        <StatusText id={errorId} status="error">
          We couldn't sign you in with those details. Check them and try again,
          or reset your password.
        </StatusText>
      )}
      <form
        className="flex flex-col gap-200"
        onSubmit={(event) => {
          event.preventDefault()
          if (recovery) {
            setRecoveryRequested(true)
            return
          }
          if (
            email === "demo@northwind.example" &&
            password === "northwind-demo"
          ) {
            setFailed(false)
            setSignedIn(true)
          } else setFailed(true)
        }}
      >
        <FormInput
          autoComplete="email"
          id={`${id}-email`}
          label="Work email"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          validateStatus={failed && !recovery ? "error" : "default"}
          aria-describedby={failed && !recovery ? errorId : undefined}
          aria-errormessage={failed && !recovery ? errorId : undefined}
        />
        {!recovery && (
          <FormInput
            autoComplete="current-password"
            id={`${id}-password`}
            label="Password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            validateStatus={failed ? "error" : "default"}
            aria-describedby={failed ? errorId : undefined}
            aria-errormessage={failed ? errorId : undefined}
          />
        )}
        {!recovery && (
          <div className="flex items-center justify-between gap-150">
            <FormCheckbox label="Keep me signed in" size="sm" />
            <Link
              href="#recovery"
              onClick={(event) => {
                event.preventDefault()
                setRecovery(true)
              }}
            >
              Forgot password?
            </Link>
          </div>
        )}
        <Button block type="submit" variant="primary">
          {recovery ? "Show demo recovery instructions" : "Sign in"}
        </Button>
      </form>
      {recoveryRequested && recovery && (
        <StatusText role="status">
          No email was sent. In this prototype, return to sign in with
          demo@northwind.example and northwind-demo.
        </StatusText>
      )}
      {recovery ? (
        <Button
          variant="secondary"
          theme="outlined"
          onClick={() => {
            setRecovery(false)
            setRecoveryRequested(false)
            setFailed(false)
          }}
        >
          Back to sign in
        </Button>
      ) : (
        <Button
          variant="secondary"
          theme="outlined"
          onClick={() => {
            setRecovery(true)
            setRecoveryRequested(false)
          }}
        >
          Recover account access
        </Button>
      )}
      <p className="text-fg-secondary text-xs">
        This story demonstrates validation and local session state, not a
        production authentication service.
      </p>
    </div>
  )
}

export const Centered: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Explore a local sign-in or account-recovery flow with explicit demo credentials and no external authentication requests.",
      },
    },
  },

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const email = canvas.getByLabelText("Work email", { exact: false })
    const password = canvas.getByLabelText("Password", { exact: false })
    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect(email).toHaveAccessibleDescription(/couldn't sign you in/)
    await expect(password).toHaveAccessibleDescription(/couldn't sign you in/)
    await userEvent.type(email, "demo@northwind.example")
    await userEvent.type(password, "northwind-demo")
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }))
    await expect(
      canvas.getByRole("heading", { name: "Demo workspace" }),
    ).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Sign out of demo" }),
    )
  },

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
  parameters: {
    docs: {
      description: {
        story:
          "Explore a local sign-in or account-recovery flow with explicit demo credentials and no external authentication requests.",
      },
    },
  },

  name: "Two-factor step",
  render: function Render() {
    const [code, setCode] = useState("")
    const [recovery, setRecovery] = useState(false)
    const [verified, setVerified] = useState(false)
    const [invalid, setInvalid] = useState(false)
    const [resent, setResent] = useState(false)
    const id = useId()

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-350 bg-base p-250 text-fg-primary">
        <Brand environment="Admin" />
        <div className="flex w-full max-w-md flex-col gap-250">
          <div className="flex flex-col gap-100">
            <h1 className="font-semibold text-xl">Enter your code</h1>
            <p className="text-fg-secondary text-sm">
              Use the local demo code 123456. No message or code has been sent
              to a device.
            </p>
          </div>
          <FormInput
            autoComplete="one-time-code"
            helpText={
              invalid
                ? "The demo code did not match. Use 123456, or recovery code demo-recovery."
                : recovery
                  ? "Demo recovery code: demo-recovery"
                  : "Six digits, no spaces. Demo code: 123456"
            }
            validateStatus={invalid ? "error" : "default"}
            id={`${id}-otp`}
            inputMode={recovery ? "text" : "numeric"}
            label={recovery ? "Recovery code" : "Verification code"}
            onChange={(event) => setCode(event.target.value)}
            required
            value={code}
          />
          <FormCheckbox label="Trust this device for 30 days" size="sm" />
          <Button
            block
            disabled={
              verified || (recovery ? !code.trim() : !/^\d{6}$/.test(code))
            }
            onClick={() => {
              const valid = code === (recovery ? "demo-recovery" : "123456")
              setInvalid(!valid)
              setVerified(valid)
            }}
            variant="primary"
          >
            {verified ? "Demo verified" : "Verify"}
          </Button>
          {verified && (
            <StatusText status="success">
              Local verification complete. No real session was created.
            </StatusText>
          )}
          {resent && (
            <StatusText role="status">
              Demo code reset to 123456. No SMS or email was sent.
            </StatusText>
          )}
          <div className="flex items-center justify-between gap-150">
            <Button
              onClick={() => {
                setRecovery((value) => !value)
                setCode("")
                setInvalid(false)
                setVerified(false)
              }}
              size="sm"
              theme="borderless"
              variant="secondary"
            >
              {recovery ? "Use authenticator code" : "Use a recovery code"}
            </Button>
            <Button
              onClick={() => {
                setResent(true)
                setCode("")
                setInvalid(false)
                setVerified(false)
              }}
              size="sm"
              theme="borderless"
              variant="secondary"
            >
              Reset demo code
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
