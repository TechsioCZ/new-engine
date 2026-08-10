"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

const ErrorOrder = ({ reset }: ErrorProps) => (
  <div className="rounded border border-danger p-600 text-center">
    <p className="mb-200 font-semibold text-danger">
      Chyba při načítání objednávky
    </p>
    <p className="mb-400 text-fg-secondary">
      Objednávka nebyla nalezena nebo k ní nemáte přístup
    </p>
    <div className="flex justify-center gap-200">
      <Button onClick={reset} size="sm" theme="solid" variant="secondary">
        Zkusit znovu
      </Button>
      <LinkButton
        as={Link}
        href="/ucet/profil"
        size="sm"
        theme="borderless"
        variant="secondary"
      >
        Zpět na objednávky
      </LinkButton>
    </div>
  </div>
)

export default ErrorOrder
