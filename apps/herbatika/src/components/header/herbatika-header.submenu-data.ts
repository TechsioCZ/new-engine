import type { StaticImageData } from "next/image";
import { resolveCategoryImage } from "@/lib/category-images";

export type HerbatikaHeaderSubmenuFeaturedItemConfig = {
  id: string;
  handle: string;
  label: string;
  src: StaticImageData;
};

export type HerbatikaHeaderSubmenuGroupConfig = {
  rootHandle: string;
  featuredItems: readonly HerbatikaHeaderSubmenuFeaturedItemConfig[];
};

export type HerbatikaHeaderSubmenuRootConfig = {
  rootHandle: string;
  submenuSourceHandle?: string;
};

const createFeaturedItem = (
  id: string,
  handle: string,
  label: string,
): HerbatikaHeaderSubmenuFeaturedItemConfig => {
  const src = resolveCategoryImage({ handle, label });

  if (!src) {
    throw new Error(`Missing category image for featured header item: ${handle}`);
  }

  return {
    id,
    handle,
    label,
    src,
  };
};

export const HERBATIKA_HEADER_SUBMENU_GROUPS = [
  {
    rootHandle: "trapi-ma",
    featuredItems: [
      createFeaturedItem(
        "kozne-problemy",
        "trapi-ma-kozne-problemy",
        "Kožné problémy",
      ),
      createFeaturedItem(
        "imunita-a-obranyschopnost",
        "trapi-ma-imunita-a-obranyschopnost",
        "Imunita a obranyschopnosť",
      ),
      createFeaturedItem(
        "travenie-a-metabolizmus",
        "trapi-ma-travenie-a-metabolizmus",
        "Trávenie a metabolizmus",
      ),
      createFeaturedItem(
        "klby-a-pohybovy-aparat",
        "trapi-ma-klby-a-pohybovy-aparat",
        "Kĺby a pohybový aparát",
      ),
      createFeaturedItem(
        "mozog-a-nervovy-system",
        "trapi-ma-mozog-a-nervovy-system",
        "Mozog a nervový systém",
      ),
      createFeaturedItem(
        "srdce-a-cievy",
        "trapi-ma-srdce-a-cievy",
        "Srdce a cievy",
      ),
      createFeaturedItem(
        "hormonalna-rovnovaha",
        "trapi-ma-hormonalna-rovnovaha",
        "Hormonálna rovnováha",
      ),
      createFeaturedItem(
        "dychacie-cesty-priedusky-a-pluca",
        "trapi-ma-dychacie-cesty-priedusky-a-pluca",
        "Dýchacie cesty, priedušky a pľúca",
      ),
      createFeaturedItem("oci-a-zrak", "trapi-ma-oci-a-zrak", "Oči a zrak"),
      createFeaturedItem(
        "oblicky-a-mocove-cesty",
        "trapi-ma-oblicky-a-mocove-cesty",
        "Obličky a močové cesty",
      ),
      createFeaturedItem(
        "chudnutie-a-krasna-linia",
        "trapi-ma-chudnutie-a-krasna-linia",
        "Chudnutie a krásna línia",
      ),
    ],
  },
  {
    rootHandle: "prirodna-kozmetika",
    featuredItems: [
      createFeaturedItem(
        "pletova-kozmetika",
        "prirodna-kozmetika-pletova-kozmetika",
        "Pleťová kozmetika",
      ),
      createFeaturedItem(
        "telova-kozmetika",
        "prirodna-kozmetika-telova-kozmetika",
        "Telová kozmetika",
      ),
      createFeaturedItem(
        "starostlivost-o-vlasy",
        "prirodna-kozmetika-starostlivost-o-vlasy",
        "Starostlivosť o vlasy",
      ),
      createFeaturedItem(
        "ustna-hygiena",
        "prirodna-kozmetika-ustna-hygiena",
        "Ústna hygiena",
      ),
      createFeaturedItem(
        "aromaterapia",
        "prirodna-kozmetika-aromaterapia",
        "Aromaterapia",
      ),
      createFeaturedItem("cbd", "prirodna-kozmetika-cbd", "CBD"),
      createFeaturedItem(
        "masazne-pomocky",
        "prirodna-kozmetika-masazne-pomocky",
        "Masážne pomôcky",
      ),
      createFeaturedItem(
        "pre-muza",
        "prirodna-kozmetika-pre-muza",
        "Pre muža",
      ),
    ],
  },
  {
    rootHandle: "doplnky-vyzivy",
    featuredItems: [
      createFeaturedItem(
        "vitaminy-a-mineraly",
        "doplnky-vyzivy-vitaminy-a-mineraly",
        "Vitamíny a minerály",
      ),
      createFeaturedItem(
        "lipozomalne-vitaminy",
        "doplnky-vyzivy-lipozomalne-vitaminy",
        "Lipozomálne vitamíny",
      ),
      createFeaturedItem(
        "probiotika-a-prebiotika",
        "doplnky-vyzivy-probiotika-a-prebiotika",
        "Probiotiká a prebiotiká",
      ),
      createFeaturedItem(
        "adaptogeny",
        "doplnky-vyzivy-adaptogeny",
        "Adaptogény",
      ),
      createFeaturedItem(
        "bylinne-extrakty",
        "doplnky-vyzivy-bylinne-extrakty",
        "Bylinné extrakty",
      ),
      createFeaturedItem(
        "omega-3-a-zdrave-tuky",
        "doplnky-vyzivy-omega-3-a-zdrave-tuky",
        "Omega-3 a zdravé tuky",
      ),
      createFeaturedItem(
        "doplnky-stravy-pre-muza",
        "doplnky-vyzivy-doplnky-stravy-pre-muza",
        "Doplnky stravy pre muža",
      ),
      createFeaturedItem(
        "doplnky-stravy-pre-zenu",
        "doplnky-vyzivy-doplnky-stravy-pre-zenu",
        "Doplnky stravy pre ženu",
      ),
      createFeaturedItem(
        "doplnky-stravy-pre-deti",
        "doplnky-vyzivy-doplnky-stravy-pre-deti",
        "Doplnky stravy pre deti",
      ),
    ],
  },
  {
    rootHandle: "potraviny-a-napoje",
    featuredItems: [
      createFeaturedItem("caje", "potraviny-a-napoje-caje", "Čaje"),
      createFeaturedItem("kava", "potraviny-a-napoje-kava", "Káva"),
      createFeaturedItem(
        "sirupy-a-medy",
        "potraviny-a-napoje-sirupy-a-medy",
        "Sirupy a medy",
      ),
      createFeaturedItem(
        "bylinne-tinktury",
        "potraviny-a-napoje-bylinne-tinktury",
        "Bylinné tinktúry",
      ),
      createFeaturedItem(
        "specialne-jedle-oleje",
        "potraviny-a-napoje-specialne-jedle-oleje",
        "Špeciálne jedlé oleje",
      ),
      createFeaturedItem(
        "zuvacky",
        "potraviny-a-napoje-zuvacky",
        "Žuvačky",
      ),
      createFeaturedItem(
        "cukriky",
        "potraviny-a-napoje-cukriky",
        "Cukríky",
      ),
    ],
  },
  {
    rootHandle: "eko-domacnost",
    featuredItems: [
      createFeaturedItem(
        "oblecenie-a-obuv",
        "eko-domacnost-oblecenie-a-obuv",
        "Oblečenie a obuv",
      ),
      createFeaturedItem(
        "eko-doplnky",
        "eko-domacnost-eko-doplnky",
        "EKO doplnky",
      ),
      createFeaturedItem(
        "rehabilitacne-pomocky",
        "eko-domacnost-rehabilitacne-pomocky",
        "Rehabilitačné pomôcky",
      ),
    ],
  },
  {
    rootHandle: "ucinne-zlozky-od-a-po-z",
    featuredItems: [
      createFeaturedItem(
        "aloe-vera",
        "ucinne-zlozky-od-a-po-z-aloe-vera",
        "Aloe vera",
      ),
      createFeaturedItem("caga", "ucinne-zlozky-od-a-po-z-caga", "Čaga"),
      createFeaturedItem(
        "pagastan-konsky",
        "ucinne-zlozky-od-a-po-z-pagastan-konsky",
        "Pagaštan konský",
      ),
      createFeaturedItem(
        "extrakt-z-pijavice-lekarskej",
        "ucinne-zlozky-od-a-po-z-extrakt-z-pijavice-lekarskej",
        "Extrakt z pijavice lekárskej",
      ),
    ],
  },
] as const satisfies readonly HerbatikaHeaderSubmenuGroupConfig[];

export const HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS = [
  { rootHandle: "trapi-ma", submenuSourceHandle: "trapi-ma-2" },
  { rootHandle: "prirodna-kozmetika" },
  { rootHandle: "doplnky-vyzivy" },
  { rootHandle: "potraviny-a-napoje" },
  { rootHandle: "eko-domacnost" },
  { rootHandle: "ucinne-zlozky-od-a-po-z" },
] as const satisfies readonly HerbatikaHeaderSubmenuRootConfig[];
