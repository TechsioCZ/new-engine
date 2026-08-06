"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useEffect, useState } from "react"

import { Disclaimer } from "./disclaimer"

const DISCLAIMER_COOKIE_NAME = "disclaimerDismissed"
const DISCLAIMER_COOKIE_MAX_AGE_MS = 864_000 * 1000
const DISCLAIMER_STORAGE_KEY = "disclaimer-dismissed"

const persistDisclaimerDismissal = async () => {
  try {
    if (window.cookieStore === undefined) {
      localStorage.setItem(DISCLAIMER_STORAGE_KEY, "true")
      return
    }

    await window.cookieStore.set({
      expires: Date.now() + DISCLAIMER_COOKIE_MAX_AGE_MS,
      name: DISCLAIMER_COOKIE_NAME,
      path: "/",
      sameSite: "strict",
      value: "true",
    })
  } catch (error: unknown) {
    console.error("Failed to persist disclaimer dismissal", error)
  }
}

export const DisclaimerWrapper = () => {
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    let isActive = true

    const readDismissal = async () => {
      try {
        let hasDismissed =
          localStorage.getItem(DISCLAIMER_STORAGE_KEY) === "true"
        if (window.cookieStore !== undefined) {
          const cookie = await window.cookieStore.get(DISCLAIMER_COOKIE_NAME)
          hasDismissed = cookie?.value === "true"
        }
        if (isActive) {
          setDismissed(hasDismissed)
        }
      } catch (error: unknown) {
        console.error("Failed to read disclaimer dismissal", error)
        if (isActive) {
          setDismissed(false)
        }
      }
    }

    void readDismissal()

    return () => {
      isActive = false
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    void persistDisclaimerDismissal()
  }

  if (dismissed !== false) {
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
