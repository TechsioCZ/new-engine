"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MarketCode } from "@/lib/market/market-runtime"
import {
  type CheckoutConsentSnapshot,
  createCheckoutConsentSnapshot,
  createDeniedCheckoutConsent,
} from "@/lib/storefront/checkout-consent"
import {
  fetchCheckoutConsent,
  persistCheckoutConsent,
} from "@/lib/storefront/checkout-consent-client"
import type { OptionalCheckoutProvider } from "@/lib/storefront/checkout-consent-provider-gate"

export const useCheckoutConsent = (market: MarketCode) => {
  const [snapshot, setSnapshot] = useState<CheckoutConsentSnapshot>(() =>
    createDeniedCheckoutConsent(market)
  )
  const [isPending, setIsPending] = useState(true)
  const revisionRef = useRef(0)
  const snapshotRef = useRef(snapshot)
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())

  const applySnapshot = useCallback((next: CheckoutConsentSnapshot) => {
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

  useEffect(() => {
    const revision = revisionRef.current + 1
    revisionRef.current = revision
    const denied = createDeniedCheckoutConsent(market)
    applySnapshot(denied)
    setIsPending(true)

    fetchCheckoutConsent(market)
      .then((consent) => {
        if (revisionRef.current === revision) {
          applySnapshot(consent)
        }
      })
      .catch(() => {
        if (revisionRef.current === revision) {
          applySnapshot(createDeniedCheckoutConsent(market))
        }
      })
      .finally(() => {
        if (revisionRef.current === revision) {
          setIsPending(false)
        }
      })
  }, [applySnapshot, market])

  const setPurpose = useCallback(
    (purpose: OptionalCheckoutProvider, granted: boolean) => {
      const next = createCheckoutConsentSnapshot({
        market,
        purposes: {
          ...snapshotRef.current.purposes,
          [purpose]: granted,
        },
      })
      if (!next) {
        return
      }

      const revision = revisionRef.current + 1
      revisionRef.current = revision
      applySnapshot(next)
      setIsPending(true)

      const persist = writeQueueRef.current.then(() =>
        persistCheckoutConsent(market, next.purposes)
      )
      writeQueueRef.current = persist.then(
        () => Promise.resolve(),
        () => Promise.resolve()
      )

      persist
        .then((persisted) => {
          if (revisionRef.current === revision) {
            applySnapshot(persisted)
          }
        })
        .catch(() => {
          if (revisionRef.current === revision) {
            applySnapshot(createDeniedCheckoutConsent(market))
          }
        })
        .finally(() => {
          if (revisionRef.current === revision) {
            setIsPending(false)
          }
        })
    },
    [applySnapshot, market]
  )

  const setHeurekaConsent = useCallback(
    (granted: boolean) => setPurpose("heureka", granted),
    [setPurpose]
  )
  const setMarketingConsent = useCallback(
    (granted: boolean) => setPurpose("marketing", granted),
    [setPurpose]
  )

  return {
    consent: snapshot,
    heurekaConsent: snapshot.purposes.heureka,
    isPending,
    marketingConsent: snapshot.purposes.marketing,
    setHeurekaConsent,
    setMarketingConsent,
  }
}
