import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"

export const OrdersEmpty = () => (
  <div className="rounded-sm border border-orders-border bg-orders-card-bg p-orders-empty text-center">
    <Icon
      className="mx-auto mb-md h-16 w-16 text-fg-tertiary"
      icon="icon-[mdi--archive-outline]"
    />
    <p className="mb-xs font-medium text-orders-fg-primary">Žádné objednávky</p>
    <p className="mb-md text-orders-fg-secondary text-orders-md">
      Zatím jste nevytvořili žádnou objednávku
    </p>
    <LinkButton
      as={Link}
      href="/products"
      size="sm"
      theme="solid"
      variant="primary"
    >
      Začít nakupovat
    </LinkButton>
  </div>
)
