import { type ComponentPropsWithRef, createRef } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { LinkButton } from "../src/atoms/link-button"
import { Carousel } from "../src/molecules/carousel"
import { ProductCard } from "../src/molecules/product-card"
import { Gallery } from "../src/organisms/gallery"
import { GalleryTemplate } from "../src/templates/gallery"

function Adapter(props: ComponentPropsWithRef<"img"> & { assetId?: string }) {
  return (
    // biome-ignore lint/performance/noImgElement: native adapter fixture verifies the actual image target.
    <img
      {...props}
      alt={props.alt ?? ""}
      data-adapter="true"
      height={props.height}
      width={props.width}
    />
  )
}

function LinkAdapter(props: ComponentPropsWithRef<"a">) {
  return <a {...props} />
}

function galleryRefTypes() {
  const div = createRef<HTMLDivElement>()
  const button = createRef<HTMLButtonElement>()
  return (
    <Gallery items={[]} ref={div}>
      <Gallery.Main ref={div} />
      <Gallery.Thumbnails
        listRef={div}
        ref={div}
        scrollAreaRef={() => () => {
          /* Type-only React 19 cleanup contract. */
        }}
      />
      <Gallery.Thumbnail index={0} ref={button} />
    </Gallery>
  )
}

describe("commerce integration contracts", () => {
  it("exposes the native gallery div and button ref targets", () => {
    expectTypeOf(galleryRefTypes).toBeFunction()
  })
  it.each([undefined, false, true, "false", "true"] as const)(
    "preserves explicit aria-disabled=%s unless disabled is authoritative",
    (ariaDisabled) => {
      for (const as of ["a", LinkAdapter] as const) {
        const html = renderToStaticMarkup(
          <LinkButton
            aria-disabled={ariaDisabled}
            as={as}
            disabled={false}
            href="/product"
          >
            Product
          </LinkButton>
        )
        if (ariaDisabled === undefined) {
          expect(html).not.toContain("aria-disabled=")
        } else {
          expect(html).toContain(`aria-disabled="${ariaDisabled}"`)
        }
      }
      const disabled = renderToStaticMarkup(
        <LinkButton aria-disabled={false} disabled href="/product">
          Product
        </LinkButton>
      )
      expect(disabled).toContain('aria-disabled="true"')
      expect(disabled).not.toContain("href=")
      expect(disabled).toContain('tabindex="-1"')
    }
  )
  it("keeps explicit disabled authoritative for native and adapter activation", () => {
    for (const as of ["a", LinkAdapter] as const) {
      const onClick = vi.fn()
      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() }
      const disabled = LinkButton({
        as,
        disabled: true,
        "aria-disabled": false,
        onClick,
        href: "/product",
      })
      disabled.props.onClick(event)
      expect(onClick).not.toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalledOnce()
      expect(event.stopPropagation).toHaveBeenCalledOnce()
      const enabled = LinkButton({
        as,
        disabled: false,
        "aria-disabled": true,
        onClick,
        href: "/product",
      })
      enabled.props.onClick(event)
      expect(onClick).toHaveBeenCalledOnce()
    }
  })
  it.each([undefined, Adapter] as const)(
    "composes product-card native/adapter missing media through the shared fallback",
    (as) => {
      const html = renderToStaticMarkup(
        <ProductCard>
          <ProductCard.Image
            alt="Shoe side view"
            as={as}
            data-extra="preserved"
            height={300}
            src=""
            width={400}
          />
        </ProductCard>
      )
      expect(html).toContain('data-image-state="error"')
      expect(html).toContain('aria-label="Shoe side view"')
      expect(html).toContain("data-image-reservation")
      expect(html).toContain('data-extra="preserved"')
      expect(html).not.toContain('src=""')
      if (as) {
        expect(html).toContain('data-adapter="true"')
      }
    }
  )
  it("composes carousel adapters and native media even when the source is missing", () => {
    for (const imageAs of [undefined, Adapter]) {
      const html = renderToStaticMarkup(
        <Carousel imageAs={imageAs} slideCount={1}>
          <Carousel.Slides
            slides={[
              {
                id: "shoe",
                src: "",
                alt: "Full shoe view",
                imageProps: {
                  width: 400,
                  height: 300,
                  "data-extra": "preserved",
                },
              },
            ]}
          />
        </Carousel>
      )
      expect(html).toContain('data-image-state="error"')
      expect(html).toContain('aria-label="Full shoe view"')
      expect(html).toContain('data-extra="preserved"')
    }
  })
  it("retains carousel per-image source and alternative overrides", () => {
    const html = renderToStaticMarkup(
      <Carousel slideCount={1}>
        <Carousel.Slides
          slides={[
            {
              id: "override",
              src: "default.jpg",
              alt: "Default alternative",
              imageProps: {
                src: "",
                alt: "Localized shoe detail",
                width: 400,
                height: 300,
              },
            },
          ]}
        />
      </Carousel>
    )
    expect(html).toContain('data-image-state="error"')
    expect(html).toContain('aria-label="Localized shoe detail"')
    expect(html).not.toContain('src="default.jpg"')
  })
  it("keeps missing thumbnail media and fallbacks decorative with descriptive buttons", () => {
    const html = renderToStaticMarkup(
      <Gallery
        getThumbnailAriaLabel={() => "Show shoe side view"}
        hideThumbnailsWhenSingle={false}
        items={[
          {
            id: "shoe",
            src: "",
            alt: "Shoe full view",
            thumbnailAlt: "Never duplicate this",
            thumbnailImageProps: { alt: "Must not override decorative alt" },
          },
        ]}
        thumbnailImageAs={Adapter}
      >
        <Gallery.Thumbnails />
      </Gallery>
    )
    expect(html).toContain('aria-label="Show shoe side view"')
    expect(html).toContain('data-image-state="error"')
    expect(html).toContain('alt=""')
    expect(html).not.toContain("Never duplicate this")
    expect(html).not.toContain("Must not override")
    expect(html).toContain('aria-hidden="true"')
  })
  it("forwards a gallery template name to its carousel landmark", () => {
    const html = renderToStaticMarkup(
      <GalleryTemplate
        aria-label="Small product images"
        items={[{ id: "a", src: "", alt: "A" }]}
      />
    )
    const region = html.match(/<section\b[^>]*data-part="root"[^>]*>/)?.[0]
    expect(region).toContain('role="region"')
    expect(region).toContain('aria-label="Small product images"')
    expect(html).not.toContain('aria-label="Product images"')
  })
  it("offers an autoplay toggle independently of all navigation flags", () => {
    const html = renderToStaticMarkup(
      <GalleryTemplate
        autoplay={{ delay: 900 }}
        items={[
          { id: "a", src: "", alt: "A" },
          { id: "b", src: "", alt: "B" },
        ]}
        showAutoplay={false}
        showControls={false}
        showIndicators={false}
        showThumbnails={false}
      />
    )
    expect(html).toContain('data-part="autoplay-trigger"')
    expect(html).not.toContain('data-part="next-trigger"')
    expect(html).not.toContain('data-part="indicator"')
  })
})
