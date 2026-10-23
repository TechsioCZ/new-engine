import { type ComponentPropsWithRef, createRef, type Ref } from "react"
import { Badge } from "../src/atoms/badge"
import { Icon } from "../src/atoms/icon"
import { Image, ImageWithFallback } from "../src/atoms/image"
import { Label } from "../src/atoms/label"
import { Link, type NativeLinkProps } from "../src/atoms/link"
import { LinkButton } from "../src/atoms/link-button"

function ButtonAdapter(
  props: ComponentPropsWithRef<"button"> & { href?: string }
) {
  return <button {...props} />
}
function ImageAdapter(
  props: ComponentPropsWithRef<"img"> & { priority?: boolean }
) {
  // biome-ignore lint/performance/noImgElement: Native adapter contract, not a Next.js app.
  return <img alt={props.alt} height={80} width={80} {...props} />
}
function RefLessLink({ href }: { href: string }) {
  return <a href={href}>Orders</a>
}
function RefLessImage({ src, alt }: { src: string; alt: string }) {
  // biome-ignore lint/performance/noImgElement: Native ref-less adapter type fixture.
  return <img alt={alt} height={80} src={src} width={80} />
}

/** Compiled by the source typecheck; never invoked. */
export function actionRefConsumerContract() {
  const anchor = createRef<HTMLAnchorElement>()
  const button = createRef<HTMLButtonElement>()
  const span = createRef<HTMLSpanElement>()
  const image = createRef<HTMLImageElement>()
  const native: NativeLinkProps = {
    href: "/orders",
    children: "Orders",
    ref: anchor,
  }
  const acceptsButton = (ref: Ref<HTMLButtonElement>) => ref
  const acceptsImage = (ref: Ref<HTMLImageElement>) => ref
  return (
    <>
      <Link {...native} />
      <Link href="/orders" ref={anchor}>
        Orders
      </Link>
      <Link
        as="button"
        ref={(node) => {
          if (node) {
            node.disabled = false
          }
        }}
      >
        Orders
      </Link>
      <Link
        as={ButtonAdapter}
        ref={(node) => {
          if (node) {
            node.disabled = false
          }
        }}
      >
        Orders
      </Link>
      <Link as={RefLessLink} href="/orders">
        Orders
      </Link>
      <LinkButton as={ButtonAdapter} ref={button}>
        Orders
      </LinkButton>
      <LinkButton href="/orders" ref={anchor}>
        Orders
      </LinkButton>
      <LinkButton
        as="button"
        ref={(node) => {
          if (node) {
            node.disabled = false
          }
        }}
      >
        Orders
      </LinkButton>
      <Icon icon="token-icon-info" ref={span} />
      <Icon
        icon="token-icon-info"
        ref={(node) => {
          if (node) {
            node.dataset.ready = "true"
          }
        }}
      />
      <Label ref={createRef<HTMLLabelElement>()}>Project name</Label>
      <Label
        ref={(node) => {
          if (node) {
            node.htmlFor = "project-name"
          }
        }}
      >
        Project name
      </Label>
      <Badge ref={span}>Ready</Badge>
      <Badge
        ref={(node) => {
          if (node) {
            node.dataset.ready = "true"
          }
        }}
      >
        Ready
      </Badge>
      <Badge
        bgColor="white"
        borderColor="black"
        fgColor="black"
        ref={span}
        variant="dynamic"
      >
        Ready
      </Badge>
      <Image alt="Bowl" ref={image} src="/photo.png" />
      <Image
        alt="Bowl"
        ref={(node) => {
          if (node) {
            node.decode()
          }
        }}
        src="/photo.png"
      />
      <Image
        alt="Bowl"
        as={ImageAdapter}
        priority
        ref={image}
        src="/photo.png"
      />
      <Image
        alt="Bowl"
        as={ImageAdapter}
        ref={(node) => {
          if (node) {
            node.decode()
          }
        }}
        src="/photo.png"
      />
      <Image alt="Bowl" as={RefLessImage} src="/photo.png" />
      <ImageWithFallback
        alt="Bowl"
        as={ImageAdapter}
        ref={image}
        src="/photo.png"
      />
      {/* @ts-expect-error Anchor refs do not match button adapters. */}
      <Link as={ButtonAdapter} ref={anchor}>
        Orders
      </Link>
      {/* @ts-expect-error A ref-less adapter does not acquire a ref. */}
      <Link as={RefLessLink} href="/orders" ref={anchor}>
        Orders
      </Link>
      {/* @ts-expect-error LinkButton preserves the selected adapter ref. */}
      <LinkButton as={ButtonAdapter} ref={anchor}>
        Orders
      </LinkButton>
      {/* @ts-expect-error LinkButton does not manufacture ref-less adapter support. */}
      <LinkButton as={RefLessLink} href="/orders" ref={anchor}>
        Orders
      </LinkButton>
      {/* @ts-expect-error Image adapters cannot receive anchor refs. */}
      <Image alt="Bowl" as={ImageAdapter} ref={anchor} src="/photo.png" />
      {/* @ts-expect-error Ref-less image adapters do not acquire refs. */}
      <Image alt="Bowl" as={RefLessImage} ref={image} src="/photo.png" />
      {/* @ts-expect-error Fallback adapters must forward load and error events. */}
      <ImageWithFallback alt="Bowl" as={RefLessImage} src="/photo.png" />
      <Image
        alt="Bowl"
        ref={(node) => {
          // @ts-expect-error A native image callback receives an image, not a button.
          acceptsButton({ current: node })
        }}
        src="/photo.png"
      />
      <Link
        href="/orders"
        ref={(node) => {
          // @ts-expect-error A native Link callback receives an anchor, not an image.
          acceptsImage({ current: node })
        }}
      >
        Orders
      </Link>
    </>
  )
}
