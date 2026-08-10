import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import Link from "next/link"

export const OrdersEmpty = () => (
  <div className="rounded border border-border-secondary bg-base p-600 text-center">
    <Icon className="text-2xl text-fg-secondary" icon="token-icon-archive" />
    <p className="mb-100 font-medium text-fg-primary">Žádné objednávky</p>
    <p className="mb-400 text-fg-secondary text-sm">
      Zatím jste nevytvořili žádnou objednávku
    </p>
    <Button size="sm" theme="solid" variant="primary">
      <Link href="/produkty">Začít nakupovat</Link>
    </Button>
  </div>
)
