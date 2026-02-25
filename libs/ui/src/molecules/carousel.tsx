import * as carousel from "@zag-js/carousel"
import { normalizeProps, useMachine } from "@zag-js/react"
import {
  type CSSProperties,
  type ComponentPropsWithoutRef,
  createContext,
  type ElementType,
  type ReactNode,
  useContext,
  useId,
} from "react"
import { tv, type VariantProps } from "tailwind-variants"
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
  slots: {
    wrapper: ["relative w-fit"],
    root: ["relative overflow-hidden", "rounded-carousel"],
    control: [
      "flex gap-carousel-control p-carousel-control",
      "bg-carousel-control-bg",
      "rounded-carousel",
    ],
    slideGroup: [
      "overflow-hidden",
      "scrollbar-hide",
      "data-dragging:cursor-grabbing",
      "data-[orientation=vertical]:h-full",
    ],
    slide: [
      "relative shrink-0",
      "flex items-center justify-center",
      "overflow-hidden",
      "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-full",
    ],
    prevTrigger: "",
    nextTrigger: "",
    indicatorGroup: [
      "flex w-full items-center justify-center gap-carousel-indicator",
    ],
    indicator: [
      "aspect-carousel-indicator w-carousel-indicator bg-carousel-indicator-bg",
      "data-current:bg-carousel-indicator-bg-active",
      "data-current:border-carousel-indicator-border-active",
      "rounded-carousel-indicator border border-carousel-indicator-border",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    autoplayIcon: ["icon-[mdi--play]", "data-[pressed=true]:icon-[mdi--pause]"],
    autoplayTrigger: [
      "absolute top-carousel-trigger-top right-carousel-trigger-right z-50",
      "bg-carousel-trigger-bg",
    ],
    spacer: ["flex-1"],
  },
  compoundSlots: [
    {
      slots: ["autoplayTrigger", "indicator", "prevTrigger", "nextTrigger"],
      class: [
        "p-carousel-trigger",
        "text-carousel-trigger-fg",
        "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
        "focus-visible:outline-carousel-ring",
        "focus-visible:outline-offset-(length:--default-ring-offset)",
      ],
    },
    {
      slots: ["prevTrigger", "nextTrigger"],
      class: [
        'bg-carousel-trigger-bg hover:bg-carousel-trigger-bg-hover text-carousel-trigger-size',
        'hover:text-carousel-trigger-fg-hover',
        'transition-colors duration-200 motion-reduce:transition-none',
      ],
    },
  ],
  variants: {
    objectFit: {
      cover: {
        slide: "*:h-full *:w-full *:object-cover",
      },
      contain: {
        slide: "*:h-full *:w-full *:object-contain",
      },
      fill: {
        slide: "*:h-full *:w-full *:object-fill",
      },
      none: {
        slide: "",
      },
    },
    controlPosition: {
      side: {
        control: "flex-col items-center justify-between",
      },
      top: {
        control: "-translate-x-1/2 absolute top-0 left-1/2",
      },
      bottom: {
        control: "-translate-x-1/2 absolute bottom-0 left-1/2",
      },
      unset: {},
    },
    aspectRatio: {
      square: {
        slideGroup: "data-[orientation=vertical]:aspect-square",
        slide: "data-[orientation=horizontal]:aspect-square",
      },
      landscape: {
        slideGroup: "data-[orientation=vertical]:aspect-video",
        slide: "data-[orientation=horizontal]:aspect-video",
      },
      portrait: {
        slideGroup: "data-[orientation=vertical]:aspect-portrait",
        slide: "data-[orientation=horizontal]:aspect-portrait",
      },
      wide: {
        slideGroup: "data-[orientation=vertical]:aspect-wide",
        slide: "data-[orientation=horizontal]:aspect-wide",
      },
      none: {
        slideGroup: "",
        slide: "",
      },
    },
    size: {
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
      full: {
        root: [
          "data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full",
        ],
      },
    },
  },
  defaultVariants: {
    aspectRatio: "square",
    objectFit: "cover",
    size: "md",
    controlPosition: "bottom",
  },
})

interface CarouselContextValue {
  api: ReturnType<typeof carousel.connect>
  size?: "sm" | "md" | "lg" | "full"
  objectFit?: "cover" | "contain" | "fill" | "none"
  aspectRatio?: "square" | "landscape" | "portrait" | "wide" | "none"
}

const CarouselContext = createContext<CarouselContextValue | null>(null)

const useCarouselContext = () => {
  const context = useContext(CarouselContext)
  if (!context) {
    throw new Error("Carousel components must be used within Carousel.Root")
  }
  return context
}

export type CarouselSlide = {
  id: string
  content?: ReactNode
  src?: string
  alt?: string
  imageProps?: Record<string, unknown>
}

type CarouselDimension = CSSProperties["width"]

export interface CarouselRootProps<T extends ElementType = typeof Image>
  extends Omit<VariantProps<typeof carouselVariants>, "controlPosition">,
    Omit<carousel.Props, "id" | "size"> {
  id?: string
  className?: string
  children: ReactNode
  imageAs?: CarouselImageComponent<T>
  width?: CarouselDimension
  height?: CarouselDimension
}

interface CarouselSlidesProps {
  slides: CarouselSlide[]
  size?: "sm" | "md" | "lg" | "full"
  imageAs?: ElementType
  className?: string
}

interface CarouselSlideProps {
  index: number
  children: ReactNode
  size?: "sm" | "md" | "lg" | "full"
  className?: string
}

interface CarouselPreviousProps {
  className?: string
  icon?: IconType
}

interface CarouselNextProps {
  className?: string
  icon?: IconType
}

interface CarouselIndicatorsProps {
  className?: string
}

interface CarouselIndicatorProps {
  index: number
  className?: string
  children?: ReactNode
}

interface CarouselAutoplayProps {
  className?: string
}

interface CarouselControlProps {
  children: ReactNode
  className?: string
  controlPosition?: "top" | "bottom" | "side" | "unset"
}

export function Carousel<T extends ElementType = typeof Image>({
  id,
  /* Tailwind variants */
  size,
  objectFit,
  aspectRatio,
  /* Zag.js carousel config */
  orientation = "horizontal",
  slideCount = 1,
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
}: CarouselRootProps<T>) {
  const fallbackId = useId()
  const service = useMachine(carousel.machine, {
    id: id ?? fallbackId,
    slideCount,
    autoplay,
    orientation,
    allowMouseDrag,
    loop,
    slidesPerPage,
    slidesPerMove,
    spacing,
    padding,
    dir,
    snapType,
    onPageChange,
    ...props,
  })

  const api = carousel.connect(service, normalizeProps)
  const { wrapper, root } = carouselVariants({ size, objectFit, aspectRatio })
  const rootProps = api.getRootProps()
  const resolvedRootStyle = {
    ...(rootProps.style as CSSProperties),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  }
  const resolvedWrapperStyle = {
    ...(size === "full" ? { width: "100%" } : {}),
    ...(width !== undefined ? { width } : {}),
  }

  return (
    <CarouselContext.Provider value={{ api, size, objectFit, aspectRatio }}>
      <div className={wrapper()} style={resolvedWrapperStyle}>
        <div
          {...rootProps}
          className={root({ className })}
          style={resolvedRootStyle}
        >
          {children}
        </div>
      </div>
    </CarouselContext.Provider>
  )
}

Carousel.Slides = function CarouselSlides({
  slides,
  size: overrideSize,
  imageAs,
  className,
}: CarouselSlidesProps) {
  const {
    api,
    size: contextSize,
    objectFit,
    aspectRatio,
  } = useCarouselContext()
  const size = overrideSize ?? contextSize
  const { slideGroup } = carouselVariants({
    size,
    objectFit,
    aspectRatio,
  })
  const hasCustomImageComponent = imageAs && imageAs !== Image
  const CustomImageComponent = hasCustomImageComponent
    ? (imageAs as ElementType)
    : Image

  return (
    <div className={slideGroup({ className })} {...api.getItemGroupProps()}>
      {slides.map((slide, index) => (
        <Carousel.Slide index={index} key={slide.id}>
          {slide.content || (
            hasCustomImageComponent ? (
              <CustomImageComponent
                alt={slide.alt || ""}
                src={slide.src || ""}
                {...slide.imageProps}
              />
            ) : (
              <Image
                alt={slide.alt || ""}
                src={slide.src || ""}
                {...slide.imageProps}
              />
            )
          )}
        </Carousel.Slide>
      ))}
    </div>
  )
}

Carousel.Slide = function CarouselSlide({
  index,
  children,
  size: overrideSize,
  className,
}: CarouselSlideProps) {
  const {
    api,
    size: contextSize,
    objectFit,
    aspectRatio,
  } = useCarouselContext()
  const size = overrideSize ?? contextSize
  const { slide: slideSlot } = carouselVariants({
    size,
    objectFit,
    aspectRatio,
  })
  const itemProps = api.getItemProps({ index })

  return (
    <div {...itemProps} className={slideSlot({ className })}>
      {children}
    </div>
  )
}

Carousel.Previous = function CarouselPrevious({
  className,
  icon = "token-icon-carousel-prev" as IconType,
}: CarouselPreviousProps) {
  const { api } = useCarouselContext()
  const { prevTrigger } = carouselVariants()

  return (
    <Button
      className={prevTrigger({ className })}
      {...api.getPrevTriggerProps()}
      icon={icon}
    />
  )
}

Carousel.Next = function CarouselNext({
  className,
  icon = "token-icon-carousel-next" as IconType,
}: CarouselNextProps) {
  const { api } = useCarouselContext()
  const { nextTrigger } = carouselVariants()

  return (
    <Button
      className={nextTrigger({ className })}
      {...api.getNextTriggerProps()}
      icon={icon}
    />
  )
}

Carousel.Indicators = function CarouselIndicators({
  className,
  children,
}: CarouselIndicatorsProps & { children?: ReactNode }) {
  const { api } = useCarouselContext()
  const { indicatorGroup, indicator } = carouselVariants()

  // If children are provided, render them (custom indicators)
  if (children) {
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
      {api.pageSnapPoints.map((_, index) => (
        <Button
          className={indicator()}
          key={`indicator-${index}`}
          {...api.getIndicatorProps({ index })}
        />
      ))}
    </div>
  )
}

Carousel.Indicator = function CarouselIndicator({
  index,
  className,
  children,
}: CarouselIndicatorProps) {
  const { api } = useCarouselContext()
  const { indicator } = carouselVariants()

  return (
    <Button
      className={indicator({ className })}
      {...api.getIndicatorProps({ index })}
    >
      {children}
    </Button>
  )
}

Carousel.Autoplay = function CarouselAutoplay({
  className,
}: CarouselAutoplayProps) {
  const { api } = useCarouselContext()
  const { autoplayTrigger: autoplayTriggerSlot } = carouselVariants()

  return (
    <Button
      className={autoplayTriggerSlot({ className })}
      icon={api.isPlaying ? "icon-[mdi--pause]" : "icon-[mdi--play]"}
      {...api.getAutoplayTriggerProps()}
    />
  )
}

Carousel.Control = function CarouselControl({
  children,
  className,
  controlPosition,
}: CarouselControlProps) {
  const { api } = useCarouselContext()
  const { control } = carouselVariants({ controlPosition })

  return (
    <div className={control({ className })} {...api.getControlProps()}>
      {children}
    </div>
  )
}

Carousel.Root = Carousel
