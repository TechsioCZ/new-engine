import { Button } from "@techsio/ui-kit/atoms/button"

export function OrdersError() {
  return (
    <div className="rounded-sm border border-orders-danger bg-orders-card-bg p-lg text-center">
      <p className="mb-xs font-medium text-orders-danger">
        Chyba při načítání objednávek
      </p>
      <Button
        onClick={() => {
          window.location.reload()
        }}
        size="sm"
        theme="solid"
        variant="secondary"
      >
        Zkusit znovu
      </Button>
    </div>
  )
}
