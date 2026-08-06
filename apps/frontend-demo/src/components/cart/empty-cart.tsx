import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"

export const EmptyCart = () => (
  <div className="py-cart-empty-y text-center">
    <Icon
      className="mb-cart-empty-icon-margin"
      icon="icon-[mdi--cart-outline]"
      size="2xl"
    />
    <h2 className="mb-cart-empty-title-margin font-cart-empty-title text-cart-empty-title">
      Váš košík je prázdný
    </h2>
    <p className="mb-cart-empty-text-margin text-cart-empty-text">
      Vypadá to, že jste do košíku ještě nic nepřidali.
    </p>
    <LinkButton
      as={Link}
      href="/products"
      icon="icon-[mdi--shopping-outline]"
      size="lg"
    >
      Začít Nakupovat
    </LinkButton>
  </div>
)
