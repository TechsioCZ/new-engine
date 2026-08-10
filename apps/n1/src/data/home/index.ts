import type { CarouselSlide } from "@techsio/ui-kit/molecules/carousel"
import type NextImage from "next/image"

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
    icon: carIcon,
    maintText: "DOPRAVA ZDARMA",
    subText: "Pro objednávky nad 2.000 Kč.",
  },
  {
    icon: cardIcon,
    maintText: "BEZPEČNÁ PLATBA",
    subText: "Zabezpečení online platba.",
  },
  {
    icon: mapIcon,
    maintText: "DOPRAVA ZDARMA",
    subText: "Odběrová místa PPL Parcel Shop",
  },
  {
    icon: storeIcon,
    maintText: "ŠIŘOKÁ NABÍDKA",
    subText: "Oblečení, přilby, kola, chrániče, skateboardy,...",
  },
]

export const heroCarouselSlides: CarouselSlide<typeof NextImage>[] = [
  {
    alt: "Sale banner",
    id: "1",
    imageProps: {
      height: 400,
      placeholder: "blur",
      priority: true,
      quality: 50,
    },
    src: saleImg,
  },
  {
    alt: "New arrivals banner",
    id: "2",
    imageProps: {
      height: 400,
      placeholder: "blur",
      priority: true,
      quality: 50,
    },
    src: nwImg,
  },
  {
    alt: "Tallboy promotion banner",
    id: "3",
    imageProps: {
      height: 400,
      placeholder: "blur",
      priority: true,
      quality: 50,
    },
    src: tallboyImg,
  },
]

export const topCategory = [
  { label: "Nejprodávanější přilba FOX", src: bestSellerImg },
  { label: "Purevue pro čistý obraz", src: bicularImg },
  { label: "Nabídka elektrokol", src: electroImg },
  { label: "Flat podrážky jsou v kurzu", src: tretryImg },
]
