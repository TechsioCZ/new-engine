import type { BreadcrumbItemType } from "@ui/molecules/breadcrumb"
import type { CarouselSlide } from "@ui/molecules/carousel"
import type { SelectItem } from "@ui/molecules/select"

export const breadcrumbItems: BreadcrumbItemType[] = [
  { label: "Domů", href: "/" },
  { label: "Produkty", href: "/produkty" },
  { label: "Lehátka", href: "/produkty/lehatka" },
  { label: "Lehátko Akros 120x60", href: "#", isCurrent: true },
]

export const carouselSlides: CarouselSlide[] = [
  {
    id: "carousel-1",
    src: "/carousel-1.jpg",
    alt: "Hero slide 1",
  },
  {
    id: "carousel-2",
    src: "/carousel-2.jpg",
    alt: "Hero slide 2",
  },
  {
    id: "carousel-3",
    src: "/carousel-3.jpg",
    alt: "Hero slide 3",
  },
]

export const countryItems: SelectItem[] = [
  { label: "Česká republika", value: "cz" },
  { label: "Slovensko", value: "sk" },
  { label: "Německo", value: "de" },
]
