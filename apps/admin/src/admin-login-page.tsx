import { Button } from "@techsio/ui-kit/atoms/button"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getLoginErrorMessage, loginAdmin } from "./admin-auth"
import { AdminFeedback } from "./components/admin-feedback"

type LoginPageProps = {
  onAuthenticated: () => Promise<void> | void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await loginAdmin({ email, password })
      await onAuthenticated()
      navigate("/orders?view=action-required", { replace: true })
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-base p-12">
      <section className="grid w-full max-w-xl grid-cols-1 overflow-hidden rounded-md border border-border-primary bg-surface shadow-xl">
        <form
          className="flex flex-col justify-center gap-8 p-14 md:p-19"
          onSubmit={handleSubmit}
        >
          <header>
            <h1 className="mt-2 font-bold text-3xl text-fg-primary md:text-4xl">
              Přihlášení do administrace
            </h1>
          </header>
          <FormInput
            aria-describedby={errorMessage ? "admin-login-error" : undefined}
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
            id="admin-login-email"
            label="E-mail"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            validateStatus={errorMessage ? "error" : "default"}
            value={email}
          />
          <FormInput
            aria-describedby={errorMessage ? "admin-login-error" : undefined}
            autoComplete="current-password"
            disabled={isSubmitting}
            id="admin-login-password"
            label="Heslo"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            validateStatus={errorMessage ? "error" : "default"}
            value={password}
          />
          {errorMessage && (
            <AdminFeedback id="admin-login-error" tone="error">
              {errorMessage}
            </AdminFeedback>
          )}
          <Button
            className="mt-2"
            isLoading={isSubmitting}
            loadingText="Přihlašuji..."
            type="submit"
          >
            Přihlásit se
          </Button>
        </form>
      </section>
    </main>
  )
}
