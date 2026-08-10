import { Button } from "@techsio/ui-kit/atoms/button"

export const OrdersError = () => (
  <div className="rounded border border-danger bg-base p-400 text-center">
    <p className="mb-200 font-medium text-danger">
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
