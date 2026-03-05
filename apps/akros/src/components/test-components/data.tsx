import type { BreadcrumbItemType } from "@ui/molecules/breadcrumb"
import type { CarouselSlide } from "@ui/molecules/carousel"
import type { SelectItem } from "@ui/molecules/select"
import type { StepItem } from "@ui/molecules/steps"

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

export const checkoutSteps: StepItem[] = [
  { value: 0, title: "Košík", content: <p>Položky v košíku.</p> },
  { value: 1, title: "Doprava", content: <p>Výběr dopravy a platby.</p> },
  { value: 2, title: "Údaje", content: <p>Fakturační a dodací údaje.</p> },
  { value: 3, title: "Dokončení", content: <p>Souhrn objednávky.</p> },
]

export const countryItems: SelectItem[] = [
  { label: "Česká republika", value: "cz" },
  { label: "Slovensko", value: "sk" },
  { label: "Německo", value: "de" },
]
