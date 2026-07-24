import type { StaticImageData } from "next/image"

import cykloBoty from "@/assets/header/cyklo-boty.webp"
import cykloChranice from "@/assets/header/cyklo-chranice.webp"
import cykloDoplnky from "@/assets/header/cyklo-doplnky.webp"
import cykloElektrokola from "@/assets/header/cyklo-elektrokola.webp"
import cykloKola from "@/assets/header/cyklo-kola.webp"
import cykloKomponenty from "@/assets/header/cyklo-komponenty.webp"
import cykloNaradi from "@/assets/header/cyklo-naradi.webp"
import cykloObleceni from "@/assets/header/cyklo-obleceni.webp"
import cykloPreprava from "@/assets/header/cyklo-preprava.webp"
import cykloPrilby from "@/assets/header/cyklo-prilby.webp"
import cykloSedla from "@/assets/header/cyklo-sedla.webp"
import cykloTasky from "@/assets/header/cyklo-tasky.webp"
import cykloVyziva from "@/assets/header/cyklo-vyziva.webp"
import cykloZapletenaKola from "@/assets/header/cyklo-zapletena-kola.webp"
import damskeCyklo from "@/assets/header/damske-cyklo.webp"
import damskeMoto from "@/assets/header/damske-moto.webp"
import damskeObleceni from "@/assets/header/damske-obleceni.webp"
import damskeSki from "@/assets/header/damske-ski.webp"
import damskeSnbSkate from "@/assets/header/damske-snb-skate.webp"
import detskeCyklo from "@/assets/header/detske-cyklo.webp"
import detskeMoto from "@/assets/header/detske-moto.webp"
import detskeObleceni from "@/assets/header/detske-obleceni.webp"
import detskeSki from "@/assets/header/detske-ski.webp"
import detskeSnbSkate from "@/assets/header/detske-snb-skate.webp"
import motoBoty from "@/assets/header/moto-boty.webp"
import motoBryle from "@/assets/header/moto-bryle.webp"
import motoChranice from "@/assets/header/moto-chranice.webp"
import motoDoplnky from "@/assets/header/moto-doplnky.webp"
import motoObleceni from "@/assets/header/moto-obleceni.webp"
import motoPrilby from "@/assets/header/moto-prilby.webp"
import obleceniBryle from "@/assets/header/obleceni-bryle.webp"
import obleceniBundy from "@/assets/header/obleceni-bundy.webp"
import obleceniKalhoty from "@/assets/header/obleceni-kalhoty.webp"
import obleceniKosile from "@/assets/header/obleceni-kosile.webp"
import obleceniKratasy from "@/assets/header/obleceni-kratasy.webp"
import obleceniMikiny from "@/assets/header/obleceni-mikiny.webp"
import obleceniPlavky from "@/assets/header/obleceni-plavky.webp"
import obleceniSaty from "@/assets/header/obleceni-saty.webp"
import obleceniDoplnky from "@/assets/header/obleceni-soplnky.webp"
import obleceniSvetry from "@/assets/header/obleceni-svetry.webp"
import obleceniTrika from "@/assets/header/obleceni-trika.webp"
import panskeCyklo from "@/assets/header/panske-cyklo.webp"
import panskeMoto from "@/assets/header/panske-moto.webp"
import panskeObleceni from "@/assets/header/panske-obleceni.webp"
import panskeSki from "@/assets/header/panske-ski.webp"
import panskeSnbSkate from "@/assets/header/panske-snb-skt.webp"
import skiDoplnky from "@/assets/header/ski-doplnky.webp"
import skiObleceni from "@/assets/header/ski-obleceni.webp"
import snbBrusle from "@/assets/header/snb-brusle.webp"
import snbSkate from "@/assets/header/snb-skate.webp"
import snbSnowboard from "@/assets/header/snb-snowboard.webp"
import { allCategories, rootCategories } from "@/data/static/categories"
import { ALL_CATEGORIES_MAP } from "@/lib/constants"

const headerImgs = {
  panske: {
    cyklo: panskeCyklo,
    moto: panskeMoto,
    obleceni: panskeObleceni,
    ski: panskeSki,
    snbSkate: panskeSnbSkate,
  },
  damske: {
    cyklo: damskeCyklo,
    moto: damskeMoto,
    obleceni: damskeObleceni,
    ski: damskeSki,
    snbSkate: damskeSnbSkate,
  },
  detske: {
    cyklo: detskeCyklo,
    moto: detskeMoto,
    obleceni: detskeObleceni,
    ski: detskeSki,
    snbSkate: detskeSnbSkate,
  },
  obleceni: {
    bryle: obleceniBryle,
    bundy: obleceniBundy,
    kalhoty: obleceniKalhoty,
    kosile: obleceniKosile,
    kratasy: obleceniKratasy,
    mikiny: obleceniMikiny,
    plavky: obleceniPlavky,
    saty: obleceniSaty,
    doplnky: obleceniDoplnky,
    svetry: obleceniSvetry,
    trika: obleceniTrika,
  },
  cyklo: {
    boty: cykloBoty,
    doplnky: cykloDoplnky,
    elektrokola: cykloElektrokola,
    chranice: cykloChranice,
    kola: cykloKola,
    komponenty: cykloKomponenty,
    naradi: cykloNaradi,
    obleceni: cykloObleceni,
    preprava: cykloPreprava,
    prilby: cykloPrilby,
    sedla: cykloSedla,
    tasky: cykloTasky,
    vyziva: cykloVyziva,
    zapletenaKola: cykloZapletenaKola,
  },
  moto: {
    boty: motoBoty,
    bryle: motoBryle,
    doplnky: motoDoplnky,
    chranice: motoChranice,
    obleceni: motoObleceni,
    prilby: motoPrilby,
  },
  snbSkate: {
    brusle: snbBrusle,
    skate: snbSkate,
    snowboard: snbSnowboard,
  },
  ski: {
    doplnky: skiDoplnky,
    obleceni: skiObleceni,
  },
}

type SubMenuItem = {
  name: string
  href: string
  image?: StaticImageData | undefined
  categoryIds?: string[] // Optional for backward compatibility
}

export type SubmenuCategory = {
  name: string
  href: string
  items: SubMenuItem[]
}

// ============================================
// DYNAMICALLY GENERATED VERSIONS
// ============================================

// Exception mapping for special category names
const CATEGORY_IMAGE_EXCEPTIONS: Record<string, string> = {
  skateboarding: "skateboard",
  snowboarding: "snowboard",
  "saty-a-sukne": "saty",
  "trika-a-tilka": "trika",
  "doplnky-komponenty": "doplnky",
}
const CATEGORY_SUFFIX_REGEX = /-category-\d+$/

// Helper: Convert handle to headerImgs key (removes -category-XXX pattern and converts to camelCase)
const handleToImageKey = (handle: string): string => {
  // Remove "-category-XXX" pattern
  const cleanHandle = handle.replace(CATEGORY_SUFFIX_REGEX, "")

  // Check for exceptions first
  if (CATEGORY_IMAGE_EXCEPTIONS[cleanHandle]) {
    return CATEGORY_IMAGE_EXCEPTIONS[cleanHandle]
  }

  // Convert to camelCase
  return cleanHandle
    .split("-")
    .map((word, i) =>
      i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("")
}

// Helper: Get image for category based on handle path
const getImageForCategory = (
  parentHandle: string,
  childHandle: string
): StaticImageData | undefined => {
  const parentKey = handleToImageKey(parentHandle) as keyof typeof headerImgs

  // Try to find matching image in headerImgs structure
  const parentImages = headerImgs[parentKey]
  if (!parentImages || typeof parentImages !== "object") {
    if (process.env["NODE_ENV"] === "development") {
      console.warn(
        `[Header] No images found for parent category: ${parentHandle} (key: ${parentKey})`
      )
    }
    return
  }

  // Convert child handle to camelCase for image lookup
  const childKey = handleToImageKey(childHandle) as keyof typeof parentImages

  const image = parentImages[childKey] as StaticImageData | undefined
  if (!image && process.env["NODE_ENV"] === "development") {
    console.warn(
      `[Header] No image found for category: ${parentHandle}/${childHandle} (keys: ${parentKey}/${String(childKey)})`
    )
  }
  return image
}

// Generate navigation links from rootCategories
export const links = [
  {
    href: "/novinky",
    label: "Novinky",
  },
  ...rootCategories.map((category) => ({
    href: `/kategorie/${category.handle}`,
    label: category.name,
  })),
  {
    href: "/vyprodej",
    label: "Výprodej",
  },
]

// Generate submenu items from categories
export const submenuItems: SubmenuCategory[] = rootCategories.map((rootCat) => {
  // Find all direct children of this root category
  const directChildren = allCategories.filter(
    (cat) => cat.parent_category_id === rootCat.id
  )

  return {
    name: rootCat.name,
    href: `/kategorie/${rootCat.handle}`,
    items: directChildren.map((child) => ({
      name: child.name,
      href: `/kategorie/${child.handle}`,
      image: getImageForCategory(rootCat.handle, child.handle),
      categoryIds: ALL_CATEGORIES_MAP[child.handle] || [],
    })),
  }
})
