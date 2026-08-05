"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorCheckout({ reset }: ErrorProps) {
  return (
    <div className="container mx-auto p-500">
      <h1 className="font-bold text-2xl text-fg-primary">
        Pokladna není dostupná
      </h1>
      <p className="mt-200 text-fg-secondary">
        Nepodařilo se načíst data pro dokončení objednávky.
      </p>
      <div className="mt-400 flex flex-wrap gap-200">
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
  )
}
