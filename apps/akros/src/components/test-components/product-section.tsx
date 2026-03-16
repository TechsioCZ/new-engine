import { Button } from "@ui/atoms/button"
import { Badge } from "@ui/atoms/badge"
import { StatusText } from "@ui/atoms/status-text"
import { ProductCard } from "@ui/molecules/product-card"
import { TestComponentsSection } from "./section"
import NextImage from "next/image"

export function ProductSection() {
  return (
    <TestComponentsSection
      title="ProductCard + Badge + StatusText"
      description="Produktová karta upravená směrem k Figma vzhledu: kompaktní formát, badge stack, wishlist nahoře, textové bloky a full CTA."
    >
      <div className="grid grid-cols-1 justify-items-start gap-300 md:grid-cols-2 xl:grid-cols-3">
        <ProductCard className="relative" layout="column">
          <ProductCard.Badges className="absolute top-100 left-100 z-10 flex-col items-start">
            <Badge variant="warning">Doporučujeme</Badge>
            <Badge variant="info">Video</Badge>
            <Badge variant="danger">Doprodej</Badge>
          </ProductCard.Badges>

          <Button
            className="absolute top-100 right-100 z-10"
            icon="token-icon-heart"
            size="current"
            theme="unstyled"
          />

          <ProductCard.Image
            as={NextImage}
            width={200}
            height={200}
            alt="Spojovací materiál"
            className="mx-auto"
            src="/tshirt.webp"
          />

          <ProductCard.Name>SPOJOVACÍ MATERIÁL MATKY A ŠROUBKY NA DVA ŘÁDKY</ProductCard.Name>

          <div className="flex items-center justify-between gap-100">
            <ProductCard.Stock status="in-stock">
              SKLADEM
            </ProductCard.Stock>
            <Badge variant="secondary">Více variant</Badge>
          </div>

          <p className="text-sm text-fg-secondary">
            Pište na klávesnici stejně jako dospělí! S tímto dřevěným notebookem
            můžou mladí...
          </p>

          <p className="font-semibold text-md">Délka 40 - 420 mm, ø 4 - 22 mm</p>

          <ProductCard.Actions>
            <ProductCard.Button buttonVariant="cart" className="w-full text-button-md">
              VYBRAT VARIANTU
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>

      </div>

      <div className="mt-300 grid grid-cols-1 gap-200 md:grid-cols-2">
        <StatusText showIcon status="success">
          Produkt je skladem a připraven k expedici.
        </StatusText>
        <StatusText showIcon status="error">
          Produkt není skladem.
        </StatusText>
      </div>
    </TestComponentsSection>
  )
}
