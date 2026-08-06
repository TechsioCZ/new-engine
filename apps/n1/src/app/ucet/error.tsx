"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

const ErrorAccount = ({ reset }: ErrorProps) => (
  <main className="mx-auto w-2xl max-w-full py-400">
    <div className="rounded border border-danger p-300">
      <h2 className="mb-100 font-semibold text-danger">
        Nepodařilo se načíst účet
      </h2>
      <p className="text-fg-secondary">
        Zkuste to prosím znovu nebo se vraťte na hlavní stránku.
      </p>
      <div className="mt-300 flex flex-wrap gap-200">
        <Button onClick={reset} size="sm" theme="solid" variant="secondary">
          Zkusit znovu
        </Button>
        <LinkButton
          as={Link}
          href="/"
          size="sm"
          theme="solid"
          variant="primary"
        >
          Zpět na hlavní stránku
        </LinkButton>
      </div>
    </div>
  </main>
)

export default ErrorAccount
