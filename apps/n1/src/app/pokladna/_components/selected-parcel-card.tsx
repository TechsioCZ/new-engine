import { Button } from "@techsio/ui-kit/atoms/button"

import type { PplAccessPointData } from "./ppl-widget"

export function SelectedParcelCard({
  accessPoint,
  onChangeClick,
}: {
  accessPoint: PplAccessPointData
  onChangeClick: () => void
}) {
  const address = accessPoint.address

  return (
    <div className="mt-300 rounded border border-border-secondary bg-overlay/30 p-300">
      <div className="flex items-start justify-between gap-200">
        <div className="flex-1">
          <p className="font-medium text-fg-primary text-sm">
            Výdejní místo: {accessPoint.name}
          </p>
          {address && (
            <p className="mt-50 text-fg-secondary text-xs">
              {[address.street, address.zipCode, address.city]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
        <Button
          className="shrink-0"
          onClick={onChangeClick}
          size="sm"
          variant="secondary"
        >
          Změnit
        </Button>
      </div>
    </div>
  )
}
