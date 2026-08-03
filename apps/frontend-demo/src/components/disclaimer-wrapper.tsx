"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useEffect, useState } from "react"

import { Disclaimer } from "./disclaimer"

export function DisclaimerWrapper() {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    const hasCookie = document.cookie.includes("disclaimerDismissed=true")
    setDismissed(hasCookie)
  }, [])

  const handleDismiss = () => {
    document.cookie =
      "disclaimerDismissed=true; path=/; max-age=864000; SameSite=Strict" // 1 year
    setDismissed(true)
  }

  if (dismissed || dismissed === null) {
    return null
  }

  return (
    <Disclaimer
      className="fixed z-50 w-full"
      hideIcon
      size="sm"
      variant="default"
    >
      <article className="flex flex-col gap-2">
        <h2 className="font-bold text-md">Demo aplikace</h2>
        <p>
          Aplikace slouží jenom jako ukázka možností nové platformy. Všechny
          objednávky a transakce jsou fiktivní a nemají žádnou reálnou hodnotu.
        </p>
        <Button
          className="w-fit"
          onClick={handleDismiss}
          size="sm"
          theme="light"
          variant="primary"
        >
          Beru na vědomí
        </Button>
      </article>
    </Disclaimer>
  )
}
