import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getLoginErrorMessage, loginAdmin } from "./admin-auth"

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
    <main className="admin-login-shell">
      <section className="admin-login-panel">
        <div className="admin-login-brand">
          <span className="admin-brand-mark">NE</span>
          <div>
            <span>New Engine</span>
            <strong>Admin</strong>
          </div>
        </div>
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <header>
            <span className="admin-eyebrow">Prihlaseni</span>
            <h1>Admin pristup</h1>
          </header>
          <label className="admin-field">
            <span>E-mail</span>
            <input
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="admin-field">
            <span>Heslo</span>
            <input
              autoComplete="current-password"
              disabled={isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {errorMessage && (
            <p className="admin-login-error" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            className="admin-login-submit"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Prihlasuji..." : "Prihlasit"}
          </button>
        </form>
      </section>
    </main>
  )
}
