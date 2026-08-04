import type { CarouselSlide } from "@techsio/ui-kit/molecules/carousel"

import nwImg from "@/assets/carousel/nw.webp"
import saleImg from "@/assets/carousel/sale.webp"
import tallboyImg from "@/assets/carousel/tallboy.webp"
import carIcon from "@/assets/icons/car.png"
import cardIcon from "@/assets/icons/card.png"
import mapIcon from "@/assets/icons/map.png"
import storeIcon from "@/assets/icons/store.png"
import bestSellerImg from "@/assets/top-category/bestseller.webp"
import bicularImg from "@/assets/top-category/bicular.webp"
import electroImg from "@/assets/top-category/electro.webp"
import tretryImg from "@/assets/top-category/tretry.webp"

export const featureBlocks = [
  {
    maintText: "DOPRAVA ZDARMA",
    subText: "Pro objednávky nad 2.000 Kč.",
    icon: carIcon,
  },
  {
    maintText: "BEZPEČNÁ PLATBA",
    subText: "Zabezpečení online platba.",
    icon: cardIcon,
  },
  {
    maintText: "DOPRAVA ZDARMA",
    subText: "Odběrová místa PPL Parcel Shop",
    icon: mapIcon,
  },
  {
    maintText: "ŠIŘOKÁ NABÍDKA",
    subText: "Oblečení, přilby, kola, chrániče, skateboardy,...",
    icon: storeIcon,
  },
]

export const heroCarouselSlides: CarouselSlide[] = [
  {
    id: "1",
    alt: "Sale banner",
    imageProps: {
      src: saleImg,
      height: 400,
      priority: true,
      quality: 50,
      placeholder: "blur",
    },
  },
  {
    id: "2",
    alt: "New arrivals banner",
    imageProps: {
      src: nwImg,
      height: 400,
      priority: true,
      quality: 50,
      placeholder: "blur",
    },
  },
  {
    id: "3",
    alt: "Tallboy promotion banner",
    imageProps: {
      src: tallboyImg,
      height: 400,
      priority: true,
      quality: 50,
      placeholder: "blur",
    },
  },
]

export const topCategory = [
  { src: bestSellerImg, label: "Nejprodávanější přilba FOX" },
  { src: bicularImg, label: "Purevue pro čistý obraz" },
  { src: electroImg, label: "Nabídka elektrokol" },
  { src: tretryImg, label: "Flat podrážky jsou v kurzu" },
]
