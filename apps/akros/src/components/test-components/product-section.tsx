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
            <ProductCard.Button buttonVariant="cart" className="w-full">
              VYBRAT VARIANTU
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>

        <ProductCard layout="column">
          <ProductCard.Image as={NextImage}
            width={200}
            height={200} alt="Lehátko Akros" src="/tshirt.webp" />
          <ProductCard.Name>Lehátko Akros Classic 140 x 70 cm</ProductCard.Name>
          <ProductCard.Stock status="in-stock">Skladem 12 ks</ProductCard.Stock>
          <ProductCard.Price>1 490 Kč bez DPH</ProductCard.Price>
          <ProductCard.Actions>
            <ProductCard.Button buttonVariant="detail" icon="token-icon-detail-button">
              Detail
            </ProductCard.Button>
          </ProductCard.Actions>
        </ProductCard>

        <ProductCard layout="column">
          <ProductCard.Image as={NextImage}
            width={200}
            height={200} alt="Lehátko Akros" src="/tshirt.webp" />
          <ProductCard.Name>Lehátko Akros Soft 100 x 50 cm</ProductCard.Name>
          <ProductCard.Stock status="out-of-stock">Momentálně nedostupné</ProductCard.Stock>
          <ProductCard.Price>1 050 Kč bez DPH</ProductCard.Price>
          <ProductCard.Actions>
            <ProductCard.Button
              buttonVariant="wishlist"
              icon="token-icon-wishlist-button"
            >
              Do wishlistu
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
