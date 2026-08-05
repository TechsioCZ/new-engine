"use client"

import { Button } from "@techsio/ui-kit/atoms/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorCategory({ reset }: ErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded border border-danger p-600 text-center">
        <p className="mb-200 font-semibold text-danger">
          Chyba při načítání kategorie
        </p>
        <p className="mb-400 text-fg-secondary">
          Nepodařilo se načíst produkty. Zkuste to prosím znovu.
        </p>
        <div className="flex justify-center">
          <Button onClick={reset} size="sm" theme="solid" variant="secondary">
            Zkusit znovu
          </Button>
        </div>
      </div>
    </div>
  )
}
