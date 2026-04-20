import type { StaticImageData } from "next/image";
import {
  categoryDoplnkyVyzivy,
  categoryEkoDomacnost,
  categoryPotravinyNapoje,
  categoryPrirodnaKozmetika,
  categoryTrapiMa,
} from "@/assets/category-images";

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

export const HERBATIKA_HEADER_SUBMENU_GROUPS = [
  {
    rootHandle: "trapi-ma",
    featuredItems: [
      {
        id: "kozne-problemy",
        handle: "trapi-ma-kozne-problemy",
        label: categoryTrapiMa.kozneProblemy.label,
        src: categoryTrapiMa.kozneProblemy.src,
      },
      {
        id: "imunita-a-obranyschopnost",
        handle: "trapi-ma-imunita-a-obranyschopnost",
        label: categoryTrapiMa.imunitaAObranyschopnost.label,
        src: categoryTrapiMa.imunitaAObranyschopnost.src,
      },
      {
        id: "travenie-a-metabolizmus",
        handle: "trapi-ma-travenie-a-metabolizmus",
        label: categoryTrapiMa.travenieAMetabolizmus.label,
        src: categoryTrapiMa.travenieAMetabolizmus.src,
      },
      {
        id: "klby-a-pohybovy-aparat",
        handle: "trapi-ma-klby-a-pohybovy-aparat",
        label: categoryTrapiMa.klbyAPohybovyAparat.label,
        src: categoryTrapiMa.klbyAPohybovyAparat.src,
      },
      {
        id: "mozog-a-nervovy-system",
        handle: "trapi-ma-mozog-a-nervovy-system",
        label: categoryTrapiMa.mozogANervovySystem.label,
        src: categoryTrapiMa.mozogANervovySystem.src,
      },
      {
        id: "srdce-a-cievy",
        handle: "trapi-ma-srdce-a-cievy",
        label: categoryTrapiMa.srdceACievy.label,
        src: categoryTrapiMa.srdceACievy.src,
      },
      {
        id: "hormonalna-rovnovaha",
        handle: "trapi-ma-hormonalna-rovnovaha",
        label: categoryTrapiMa.hormonalnaRovnovaha.label,
        src: categoryTrapiMa.hormonalnaRovnovaha.src,
      },
      {
        id: "dychacie-cesty-priedusky-a-pluca",
        handle: "trapi-ma-dychacie-cesty-priedusky-a-pluca",
        label: categoryTrapiMa.dychacieCestyPrieduskyAPluca.label,
        src: categoryTrapiMa.dychacieCestyPrieduskyAPluca.src,
      },
      {
        id: "oci-a-zrak",
        handle: "trapi-ma-oci-a-zrak",
        label: categoryTrapiMa.ociAZrak.label,
        src: categoryTrapiMa.ociAZrak.src,
      },
      {
        id: "oblicky-a-mocove-cesty",
        handle: "trapi-ma-oblicky-a-mocove-cesty",
        label: categoryTrapiMa.oblickyAMocoveCesty.label,
        src: categoryTrapiMa.oblickyAMocoveCesty.src,
      },
      {
        id: "chudnutie-a-krasna-linia",
        handle: "trapi-ma-chudnutie-a-krasna-linia",
        label: categoryTrapiMa.chudnutieAKrasnaLinia.label,
        src: categoryTrapiMa.chudnutieAKrasnaLinia.src,
      },
    ],
  },
  {
    rootHandle: "prirodna-kozmetika",
    featuredItems: [
      {
        id: "pletova-kozmetika",
        handle: "prirodna-kozmetika-pletova-kozmetika",
        label: categoryPrirodnaKozmetika.pletovaKozmetika.label,
        src: categoryPrirodnaKozmetika.pletovaKozmetika.src,
      },
      {
        id: "telova-kozmetika",
        handle: "prirodna-kozmetika-telova-kozmetika",
        label: categoryPrirodnaKozmetika.telovaKozmetika.label,
        src: categoryPrirodnaKozmetika.telovaKozmetika.src,
      },
      {
        id: "starostlivost-o-vlasy",
        handle: "prirodna-kozmetika-starostlivost-o-vlasy",
        label: categoryPrirodnaKozmetika.starostlivostOVlasy.label,
        src: categoryPrirodnaKozmetika.starostlivostOVlasy.src,
      },
      {
        id: "ustna-hygiena",
        handle: "prirodna-kozmetika-ustna-hygiena",
        label: categoryPrirodnaKozmetika.ustnaHygiena.label,
        src: categoryPrirodnaKozmetika.ustnaHygiena.src,
      },
      {
        id: "aromaterapia",
        handle: "prirodna-kozmetika-aromaterapia",
        label: categoryPrirodnaKozmetika.aromaterapia.label,
        src: categoryPrirodnaKozmetika.aromaterapia.src,
      },
      {
        id: "cbd",
        handle: "prirodna-kozmetika-cbd",
        label: categoryPrirodnaKozmetika.cbd.label,
        src: categoryPrirodnaKozmetika.cbd.src,
      },
      {
        id: "masazne-pomocky",
        handle: "prirodna-kozmetika-masazne-pomocky",
        label: categoryPrirodnaKozmetika.masaznePomocky.label,
        src: categoryPrirodnaKozmetika.masaznePomocky.src,
      },
      {
        id: "pre-muza",
        handle: "prirodna-kozmetika-pre-muza",
        label: categoryPrirodnaKozmetika.preMuza.label,
        src: categoryPrirodnaKozmetika.preMuza.src,
      },
    ],
  },
  {
    rootHandle: "doplnky-vyzivy",
    featuredItems: [
      {
        id: "vitaminy-a-mineraly",
        handle: "doplnky-vyzivy-vitaminy-a-mineraly",
        label: categoryDoplnkyVyzivy.vitaminyAMineraly.label,
        src: categoryDoplnkyVyzivy.vitaminyAMineraly.src,
      },
      {
        id: "lipozomalne-vitaminy",
        handle: "doplnky-vyzivy-lipozomalne-vitaminy",
        label: categoryDoplnkyVyzivy.lipozomalneVitaminy.label,
        src: categoryDoplnkyVyzivy.lipozomalneVitaminy.src,
      },
      {
        id: "probiotika-a-prebiotika",
        handle: "doplnky-vyzivy-probiotika-a-prebiotika",
        label: categoryDoplnkyVyzivy.probiotikaAPrebiotika.label,
        src: categoryDoplnkyVyzivy.probiotikaAPrebiotika.src,
      },
      {
        id: "adaptogeny",
        handle: "doplnky-vyzivy-adaptogeny",
        label: categoryDoplnkyVyzivy.adaptogeny.label,
        src: categoryDoplnkyVyzivy.adaptogeny.src,
      },
      {
        id: "bylinne-extrakty",
        handle: "doplnky-vyzivy-bylinne-extrakty",
        label: categoryDoplnkyVyzivy.bylinneExtrakty.label,
        src: categoryDoplnkyVyzivy.bylinneExtrakty.src,
      },
      {
        id: "omega-3-a-zdrave-tuky",
        handle: "doplnky-vyzivy-omega-3-a-zdrave-tuky",
        label: categoryDoplnkyVyzivy.omega3AZdraveTuky.label,
        src: categoryDoplnkyVyzivy.omega3AZdraveTuky.src,
      },
      {
        id: "doplnky-stravy-pre-muza",
        handle: "doplnky-vyzivy-doplnky-stravy-pre-muza",
        label: categoryDoplnkyVyzivy.doplnkyStravyPreMuza.label,
        src: categoryDoplnkyVyzivy.doplnkyStravyPreMuza.src,
      },
      {
        id: "doplnky-stravy-pre-zenu",
        handle: "doplnky-vyzivy-doplnky-stravy-pre-zenu",
        label: categoryDoplnkyVyzivy.doplnkyStravyPreZenu.label,
        src: categoryDoplnkyVyzivy.doplnkyStravyPreZenu.src,
      },
      {
        id: "doplnky-stravy-pre-deti",
        handle: "doplnky-vyzivy-doplnky-stravy-pre-deti",
        label: categoryDoplnkyVyzivy.doplnkyStravyPreDeti.label,
        src: categoryDoplnkyVyzivy.doplnkyStravyPreDeti.src,
      },
    ],
  },
  {
    rootHandle: "potraviny-a-napoje",
    featuredItems: [
      {
        id: "caje",
        handle: "potraviny-a-napoje-caje",
        label: categoryPotravinyNapoje.caje.label,
        src: categoryPotravinyNapoje.caje.src,
      },
      {
        id: "kava",
        handle: "potraviny-a-napoje-kava",
        label: categoryPotravinyNapoje.kava.label,
        src: categoryPotravinyNapoje.kava.src,
      },
      {
        id: "sirupy-a-medy",
        handle: "potraviny-a-napoje-sirupy-a-medy",
        label: categoryPotravinyNapoje.sirupyAMedy.label,
        src: categoryPotravinyNapoje.sirupyAMedy.src,
      },
      {
        id: "bylinne-tinktury",
        handle: "potraviny-a-napoje-bylinne-tinktury",
        label: categoryPotravinyNapoje.bylinneTinktury.label,
        src: categoryPotravinyNapoje.bylinneTinktury.src,
      },
      {
        id: "specialne-jedle-oleje",
        handle: "potraviny-a-napoje-specialne-jedle-oleje",
        label: categoryPotravinyNapoje.specialneJedleOleje.label,
        src: categoryPotravinyNapoje.specialneJedleOleje.src,
      },
      {
        id: "zuvacky",
        handle: "potraviny-a-napoje-zuvacky",
        label: categoryPotravinyNapoje.zuvacky.label,
        src: categoryPotravinyNapoje.zuvacky.src,
      },
      {
        id: "cukriky",
        handle: "potraviny-a-napoje-cukriky",
        label: categoryPotravinyNapoje.cukriky.label,
        src: categoryPotravinyNapoje.cukriky.src,
      },
    ],
  },
  {
    rootHandle: "eko-domacnost",
    featuredItems: [
      {
        id: "oblecenie-a-obuv",
        handle: "eko-domacnost-oblecenie-a-obuv",
        label: categoryEkoDomacnost.oblecenieAObuv.label,
        src: categoryEkoDomacnost.oblecenieAObuv.src,
      },
      {
        id: "eko-doplnky",
        handle: "eko-domacnost-eko-doplnky",
        label: categoryEkoDomacnost.ekoDoplnky.label,
        src: categoryEkoDomacnost.ekoDoplnky.src,
      },
      {
        id: "rehabilitacne-pomocky",
        handle: "eko-domacnost-rehabilitacne-pomocky",
        label: categoryEkoDomacnost.rehabilitacnePomocky.label,
        src: categoryEkoDomacnost.rehabilitacnePomocky.src,
      },
    ],
  },
] as const satisfies readonly HerbatikaHeaderSubmenuGroupConfig[];
