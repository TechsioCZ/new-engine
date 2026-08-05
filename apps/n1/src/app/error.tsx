"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"
import { useEffect } from "react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error)
    }
  }, [error])

  return (
    <main className="mx-auto w-full max-w-3xl px-400 py-600">
      <div className="rounded border border-border-secondary bg-surface p-400">
        <h1 className="mb-200 font-semibold text-fg-primary text-xl">
          Něco se pokazilo
        </h1>
        <p className="mb-400 text-fg-secondary">
          Zkuste akci zopakovat, nebo se vraťte na hlavní stránku.
        </p>
        <div className="flex flex-wrap gap-200">
          <Button onClick={reset} size="sm">
            Zkusit znovu
          </Button>
          <LinkButton as={Link} href="/" size="sm" theme="outlined">
            Zpět na hlavní stránku
          </LinkButton>
        </div>
      </div>
    </main>
  )
}
