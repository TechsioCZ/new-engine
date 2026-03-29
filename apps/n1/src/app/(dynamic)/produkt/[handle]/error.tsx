"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@techsio/ui-kit/atoms/button"
import { storefront } from "@/hooks/storefront-preset"

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorProduct({ reset }: ErrorProps) {
  const queryClient = useQueryClient()

  const handleRetry = () => {
    const productQueryPrefix = Array.isArray(storefront.namespace)
      ? [...storefront.namespace, "products"]
      : [storefront.namespace, "products"]

    queryClient.resetQueries({ queryKey: storefront.queryKeys.regions.all() })
    queryClient.resetQueries({
      predicate: (query) =>
        productQueryPrefix.every(
          (segment, index) => query.queryKey[index] === segment
        ),
    })
    reset()
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded border border-danger p-600 text-center">
        <p className="mb-200 font-semibold text-danger">
          Chyba při načítání produktu
        </p>
        <p className="mb-400 text-fg-secondary">
          Produkt nebyl nalezen nebo došlo k chybě při načítání.
        </p>
        <div className="flex justify-center">
          <Button
            onClick={handleRetry}
            size="sm"
            theme="solid"
            variant="secondary"
          >
            Zkusit znovu
          </Button>
        </div>
      </div>
    </div>
  )
}
