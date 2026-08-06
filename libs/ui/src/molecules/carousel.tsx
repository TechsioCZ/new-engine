/*
 * Carousel — @techsio/ui-kit molecule.
 *
 * @component Carousel
 * @componentVersion v1.0.0
 * @skill carousel-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the carousel-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/carousel"
import type { Api, Props as ZagCarouselProps } from "@zag-js/carousel"
import { normalizeProps, useMachine } from "@zag-js/react"
import { createContext, useContext, useId } from "react"
import type {
  CSSProperties,
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react"
import { tv } from "tailwind-variants"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import type { IconType } from "../atoms/icon"
import { Image } from "../atoms/image"

type CarouselImageComponent<T extends ElementType = typeof Image> =
  T extends typeof Image
    ? typeof Image
    : T extends ElementType
      ? "src" extends keyof ComponentPropsWithoutRef<T>
        ? "alt" extends keyof ComponentPropsWithoutRef<T>
          ? T
          : never
        : never
      : never

const carouselVariants = tv({
  compoundSlots: [
    {
      class: [
        "p-carousel-trigger",
        "text-carousel-trigger-fg-base",
        "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
        "focus-visible:outline-carousel-ring",
        "focus-visible:outline-offset-(length:--default-ring-offset)",
      ],
      slots: ["autoplayTrigger", "indicator", "prevTrigger", "nextTrigger"],
    },
    {
      class: [
        "bg-carousel-trigger-bg-base hover:bg-carousel-trigger-bg-hover text-carousel-trigger",
        "hover:text-carousel-trigger-fg-hover",
        "transition-colors duration-200 motion-reduce:transition-none",
      ],
      slots: ["prevTrigger", "nextTrigger"],
    },
  ],
  defaultVariants: {
    aspectRatio: "square",
    controlPosition: "bottom",
    objectFit: "cover",
    size: "md",
  },
  slots: {
    autoplayIcon: [
      "token-icon-carousel-play",
      "data-[pressed=true]:token-icon-carousel-pause",
    ],
    autoplayTrigger: [
      "absolute top-carousel-trigger-top right-carousel-trigger-right z-50",
      "bg-carousel-trigger-bg-base",
    ],
    control: [
      "flex gap-carousel-control p-carousel-control",
      "bg-carousel-control-bg",
      "rounded-carousel",
    ],
    indicator: [
      "aspect-carousel-indicator w-carousel-indicator bg-carousel-indicator-bg-base",
      "data-current:bg-carousel-indicator-bg-active",
      "data-current:border-carousel-indicator-border-active",
      "rounded-carousel-indicator border border-carousel-indicator-border-base",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    indicatorGroup: [
      "flex w-full items-center justify-center gap-carousel-indicator",
    ],
    nextTrigger: "",
    prevTrigger: "",
    root: ["relative overflow-hidden", "rounded-carousel"],
    slide: [
      "relative shrink-0",
      "flex items-center justify-center",
      "overflow-hidden",
      "data-[orientation=vertical]:size-full",
    ],
    slideGroup: [
      "overflow-hidden",
      "scrollbar-hide",
      "data-dragging:cursor-grabbing",
      "data-[orientation=vertical]:h-full",
    ],
    spacer: ["flex-1"],
    wrapper: ["relative w-fit"],
  },
  variants: {
    aspectRatio: {
      landscape: {
        slide: "data-[orientation=horizontal]:aspect-video",
        slideGroup: "data-[orientation=vertical]:aspect-video",
      },
      none: {
        slide: "",
        slideGroup: "",
      },
      portrait: {
        slide: "data-[orientation=horizontal]:aspect-portrait",
        slideGroup: "data-[orientation=vertical]:aspect-portrait",
      },
      square: {
        slide: "data-[orientation=horizontal]:aspect-square",
        slideGroup: "data-[orientation=vertical]:aspect-square",
      },
      wide: {
        slide: "data-[orientation=horizontal]:aspect-wide",
        slideGroup: "data-[orientation=vertical]:aspect-wide",
      },
    },
    controlPosition: {
      bottom: {
        control: "-translate-x-1/2 absolute bottom-0 left-1/2",
      },
      side: {
        control: "flex-col items-center justify-between",
      },
      top: {
        control: "-translate-x-1/2 absolute top-0 left-1/2",
      },
      unset: {},
    },
    objectFit: {
      contain: {
        slide: "*:object-contain *:size-full",
      },
      cover: {
        slide: "*:object-cover *:size-full",
      },
      fill: {
        slide: "*:object-fill *:size-full",
      },
      none: {
        slide: "",
      },
    },
    size: {
      full: {
        root: [
          "data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full",
        ],
      },
      lg: {
        root: [
          "data-[orientation=horizontal]:max-w-carousel-root-lg",
          "data-[orientation=vertical]:max-h-carousel-root-lg",
        ],
        slide: [
          "data-[orientation=horizontal]:max-w-carousel-root-lg",
          "data-[orientation=vertical]:max-h-carousel-root-lg",
        ],
      },
      md: {
        root: [
          "data-[orientation=horizontal]:max-w-carousel-root-md",
          "data-[orientation=vertical]:max-h-carousel-root-md",
        ],
        slide: [
          "data-[orientation=horizontal]:max-w-carousel-root-md",
          "data-[orientation=vertical]:max-h-carousel-root-md",
        ],
      },
      sm: {
        root: [
          "data-[orientation=horizontal]:max-w-carousel-root-sm",
          "data-[orientation=vertical]:max-h-carousel-root-sm",
        ],
        slide: [
          "data-[orientation=horizontal]:max-w-carousel-root-sm",
          "data-[orientation=vertical]:max-h-carousel-root-sm",
        ],
      },
    },
  },
})

type CarouselVariants = VariantProps<typeof carouselVariants>
type CarouselSize = NonNullable<CarouselVariants["size"]>
type CarouselObjectFit = NonNullable<CarouselVariants["objectFit"]>
type CarouselAspectRatio = NonNullable<CarouselVariants["aspectRatio"]>
type CarouselControlPosition = NonNullable<CarouselVariants["controlPosition"]>

/*
 * The machine api and each tailwind-variants input live in their own context so
 * the provider never has to construct a value object on every render.
 */
const CarouselApiContext = createContext<Api | null>(null)
const CarouselSizeContext = createContext<CarouselSize | undefined>(undefined)
const CarouselObjectFitContext = createContext<CarouselObjectFit | undefined>(
  undefined,
)
const CarouselAspectRatioContext = createContext<
  CarouselAspectRatio | undefined
>(undefined)

const useCarouselApi = (): Api => {
  const api = useContext(CarouselApiContext)
  if (!api) {
    throw new Error("Carousel components must be used within Carousel.Root")
  }
  return api
}

export interface CarouselSlide {
  id: string
  content?: ReactNode | undefined
  src?: string | undefined
  alt?: string | undefined
  imageProps?: Record<string, unknown> | undefined
}

type CarouselDimension = CSSProperties["width"]

export interface CarouselRootProps<T extends ElementType = typeof Image>
  extends
    Omit<CarouselVariants, "controlPosition">,
    Omit<ZagCarouselProps, "id" | "size"> {
  id?: string | undefined
  className?: string | undefined
  children: ReactNode
  imageAs?: CarouselImageComponent<T> | undefined
  width?: CarouselDimension | undefined
  height?: CarouselDimension | undefined
}

interface CarouselSlidesProps {
  slides: CarouselSlide[]
  size?: CarouselSize | undefined
  imageAs?: ElementType | undefined
  className?: string | undefined
}

interface CarouselSlideProps {
  index: number
  children: ReactNode
  size?: CarouselSize | undefined
  className?: string | undefined
}

interface CarouselPreviousProps {
  className?: string | undefined
  icon?: IconType | undefined
}

interface CarouselNextProps {
  className?: string | undefined
  icon?: IconType | undefined
}

interface CarouselIndicatorsProps {
  className?: string | undefined
}

interface CarouselIndicatorProps {
  index: number
  className?: string | undefined
  children?: ReactNode | undefined
}

interface CarouselAutoplayProps {
  className?: string | undefined
}

interface CarouselControlProps {
  children: ReactNode
  className?: string | undefined
  controlPosition?: CarouselControlPosition | undefined
}

export const Carousel = <T extends ElementType = typeof Image>({
  id,
  /* Tailwind variants */
  size,
  objectFit,
  aspectRatio,
  /* Zag.js carousel config */
  orientation = "horizontal",
  slideCount,
  loop = true,
  autoplay = false,
  allowMouseDrag = true,
  slidesPerPage = 1,
  slidesPerMove = 1,
  spacing = "0px",
  padding = "0px",
  dir = "ltr",
  snapType = "mandatory",
  /* Others */
  className,
  children,
  width,
  height,
  onPageChange,
  ...props
}: CarouselRootProps<T>) => {
  const fallbackId = useId()
  const machineProps = Object.fromEntries(
    Object.entries(props).filter(([, option]) => option !== undefined),
  )
  const service = useMachine(machine, {
    allowMouseDrag,
    autoplay,
    dir,
    id: id ?? fallbackId,
    loop,
    orientation,
    padding,
    slideCount,
    slidesPerMove,
    slidesPerPage,
    snapType,
    spacing,
    ...(onPageChange !== undefined && { onPageChange }),
    ...machineProps,
  })

  const api = connect(service, normalizeProps)
  const { wrapper, root } = carouselVariants({ aspectRatio, objectFit, size })
  const rootProps = api.getRootProps()
  const resolvedRootStyle: CSSProperties = {
    ...rootProps.style,
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  }
  const resolvedWrapperStyle: CSSProperties = {
    ...(size === "full" ? { width: "100%" } : {}),
    ...(width === undefined ? {} : { width }),
  }

  return (
    <CarouselApiContext.Provider value={api}>
      <CarouselSizeContext.Provider value={size}>
        <CarouselObjectFitContext.Provider value={objectFit}>
          <CarouselAspectRatioContext.Provider value={aspectRatio}>
            <div className={wrapper()} style={resolvedWrapperStyle}>
              <div
                {...rootProps}
                className={root({ className })}
                style={resolvedRootStyle}
              >
                {children}
              </div>
            </div>
          </CarouselAspectRatioContext.Provider>
        </CarouselObjectFitContext.Provider>
      </CarouselSizeContext.Provider>
    </CarouselApiContext.Provider>
  )
}

const CarouselSlide = ({
  index,
  children,
  size: overrideSize,
  className,
}: CarouselSlideProps) => {
  const api = useCarouselApi()
  const contextSize = useContext(CarouselSizeContext)
  const objectFit = useContext(CarouselObjectFitContext)
  const aspectRatio = useContext(CarouselAspectRatioContext)
  const size = overrideSize ?? contextSize
  const { slide: slideSlot } = carouselVariants({
    aspectRatio,
    objectFit,
    size,
  })
  const itemProps = api.getItemProps({ index })

  return (
    <div {...itemProps} className={slideSlot({ className })}>
      {children}
    </div>
  )
}

const CarouselSlides = ({
  slides,
  size: overrideSize,
  imageAs,
  className,
}: CarouselSlidesProps) => {
  const api = useCarouselApi()
  const contextSize = useContext(CarouselSizeContext)
  const objectFit = useContext(CarouselObjectFitContext)
  const aspectRatio = useContext(CarouselAspectRatioContext)
  const size = overrideSize ?? contextSize
  const { slideGroup } = carouselVariants({
    aspectRatio,
    objectFit,
    size,
  })
  const SlideImage = imageAs ?? Image

  return (
    <div className={slideGroup({ className })} {...api.getItemGroupProps()}>
      {slides.map((slide, index) => {
        const hasContent = Boolean(slide.content)

        return (
          <CarouselSlide index={index} key={slide.id}>
            {hasContent ? (
              slide.content
            ) : (
              <SlideImage
                alt={slide.alt ?? ""}
                src={slide.src ?? ""}
                {...slide.imageProps}
              />
            )}
          </CarouselSlide>
        )
      })}
    </div>
  )
}

const CarouselPrevious = ({
  className,
  icon = "token-icon-carousel-prev",
}: CarouselPreviousProps) => {
  const api = useCarouselApi()
  const { prevTrigger } = carouselVariants()

  return (
    <Button
      className={prevTrigger({ className })}
      {...api.getPrevTriggerProps()}
      icon={icon}
    />
  )
}

const CarouselNext = ({
  className,
  icon = "token-icon-carousel-next",
}: CarouselNextProps) => {
  const api = useCarouselApi()
  const { nextTrigger } = carouselVariants()

  return (
    <Button
      className={nextTrigger({ className })}
      {...api.getNextTriggerProps()}
      icon={icon}
    />
  )
}

const CarouselIndicators = ({
  className,
  children,
}: CarouselIndicatorsProps & { children?: ReactNode }) => {
  const api = useCarouselApi()
  const { indicatorGroup, indicator } = carouselVariants()
  const hasChildren = Boolean(children)

  // If children are provided, render them (custom indicators)
  if (hasChildren) {
    return (
      <div
        className={indicatorGroup({ className })}
        {...api.getIndicatorGroupProps()}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={indicatorGroup({ className })}
      {...api.getIndicatorGroupProps()}
    >
      {Array.from({ length: api.pageSnapPoints.length }, (_, index) => (
        <Button
          className={indicator()}
          key={`indicator-${index}`}
          size="current"
          theme="unstyled"
          {...api.getIndicatorProps({ index })}
        />
      ))}
    </div>
  )
}

const CarouselIndicator = ({
  index,
  className,
  children,
}: CarouselIndicatorProps) => {
  const api = useCarouselApi()
  const { indicator } = carouselVariants()

  return (
    <Button
      className={indicator({ className })}
      size="current"
      theme="unstyled"
      {...api.getIndicatorProps({ index })}
    >
      {children}
    </Button>
  )
}

const CarouselAutoplay = ({ className }: CarouselAutoplayProps) => {
  const api = useCarouselApi()
  const { autoplayTrigger: autoplayTriggerSlot } = carouselVariants()

  return (
    <Button
      className={autoplayTriggerSlot({ className })}
      icon={
        api.isPlaying ? "token-icon-carousel-pause" : "token-icon-carousel-play"
      }
      {...api.getAutoplayTriggerProps()}
    />
  )
}

const CarouselControl = ({
  children,
  className,
  controlPosition,
}: CarouselControlProps) => {
  const api = useCarouselApi()
  const { control } = carouselVariants({ controlPosition })

  return (
    <div className={control({ className })} {...api.getControlProps()}>
      {children}
    </div>
  )
}

Carousel.Slide = CarouselSlide
Carousel.Slides = CarouselSlides
Carousel.Previous = CarouselPrevious
Carousel.Next = CarouselNext
Carousel.Indicators = CarouselIndicators
Carousel.Indicator = CarouselIndicator
Carousel.Autoplay = CarouselAutoplay
Carousel.Control = CarouselControl
Carousel.Root = Carousel
Carousel.displayName = "Carousel"
