export type CategoryContextIntroSegmentPreset =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "link";
      value: string;
      handle?: string;
      href?: string;
    };

export type CategoryContextPreset = {
  introSegments?: CategoryContextIntroSegmentPreset[];
  preferredTiles?: Array<{
    handle: string;
    label: string;
  }>;
};

export const CATEGORY_CONTEXT_PRESETS: Record<string, CategoryContextPreset> = {
  "trapi-ma": {
    introSegments: [
      {
        type: "text",
        value:
          "Človek je neoddeliteľnou súčasťou prírody, každá jedna bunka je s ňou prepojená a závislá od jej ďalších zložiek: vody, vzduchu, stromov, rastlín a ďalších živých tvorov na zemi. Spôsob, akým k nej pristupujeme, sa odráža aj na našom zdraví. Trápi vás ",
      },
      {
        type: "link",
        value: "oslabená imunita",
        handle: "trapi-ma-imunita-a-obranyschopnost",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "kožné problémy",
        handle: "trapi-ma-kozne-problemy",
      },
      { type: "text", value: ", únava alebo " },
      {
        type: "link",
        value: "bolesti kĺbov",
        handle: "trapi-ma-klby-a-pohybovy-aparat",
      },
      {
        type: "text",
        value:
          "? V Herbatica sme pre vás pripravili jedinečnú kategóriu Trápi ma, v ktorej nájdete prírodné produkty rozdelené podľa účelu a oblasti zdravia. Namiesto dlhého hľadania môžete jednoducho kliknúť na problém, ktorý vás trápi, a objaviť odporúčané ",
      },
      {
        type: "link",
        value: "doplnky výživy",
        handle: "doplnky-vyzivy",
      },
      { type: "text", value: "." },
    ],
    preferredTiles: [
      { handle: "trapi-ma-kozne-problemy", label: "Kožné problémy" },
      {
        handle: "trapi-ma-mozog-a-nervovy-system",
        label: "Mozog a nervový systém",
      },
      { handle: "trapi-ma-imunita-a-obranyschopnost", label: "Imunita" },
      { handle: "trapi-ma-klby-a-pohybovy-aparat", label: "Kĺby a pohyb" },
      {
        handle: "trapi-ma-travenie-a-metabolizmus",
        label: "Trávenie a metabolizmus",
      },
      { handle: "trapi-ma-srdce-a-cievy", label: "Srdce a cievy" },
      {
        handle: "trapi-ma-hormonalna-rovnovaha",
        label: "Hormonálna rovnováha",
      },
      {
        handle: "trapi-ma-hormonalna-rovnovaha-zenske-zdravie",
        label: "Ženské zdravie",
      },
    ],
  },
  "prirodna-kozmetika": {
    introSegments: [
      {
        type: "text",
        value:
          "V kategórii Prírodná kozmetika nájdete šetrnú starostlivosť o pleť, telo aj vlasy bez zbytočnej chémie. Objavte overené produkty pre ",
      },
      {
        type: "link",
        value: "pleťovú kozmetiku",
        handle: "prirodna-kozmetika-pletova-kozmetika",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "telovú kozmetiku",
        handle: "prirodna-kozmetika-telova-kozmetika",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "starostlivosť o vlasy",
        handle: "prirodna-kozmetika-starostlivost-o-vlasy",
      },
      { type: "text", value: " a " },
      {
        type: "link",
        value: "ústnu hygienu",
        handle: "prirodna-kozmetika-ustna-hygiena",
      },
      { type: "text", value: "." },
    ],
    preferredTiles: [
      { handle: "prirodna-kozmetika-aromaterapia", label: "Aromaterapia" },
      {
        handle: "prirodna-kozmetika-pletova-kozmetika",
        label: "Pleťová kozmetika",
      },
      {
        handle: "prirodna-kozmetika-telova-kozmetika",
        label: "Telová kozmetika",
      },
      {
        handle: "prirodna-kozmetika-starostlivost-o-vlasy",
        label: "Starostlivosť o vlasy",
      },
    ],
  },
  "doplnky-vyzivy": {
    introSegments: [
      {
        type: "text",
        value:
          "Podporte svoje zdravie cielenou suplementáciou podľa aktuálnych potrieb tela. Vyberte si ",
      },
      {
        type: "link",
        value: "adaptogény",
        handle: "doplnky-vyzivy-adaptogeny",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "vitamíny a minerály",
        handle: "doplnky-vyzivy-vitaminy-a-mineraly",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "omega-3 a zdravé tuky",
        handle: "doplnky-vyzivy-omega-3-a-zdrave-tuky",
      },
      { type: "text", value: " alebo " },
      {
        type: "link",
        value: "probiotiká a prebiotiká",
        handle: "doplnky-vyzivy-probiotika-a-prebiotika",
      },
      { type: "text", value: "." },
    ],
    preferredTiles: [
      { handle: "doplnky-vyzivy-adaptogeny", label: "Adaptogény" },
      {
        handle: "doplnky-vyzivy-vitaminy-a-mineraly",
        label: "Vitamíny a minerály",
      },
      {
        handle: "doplnky-vyzivy-omega-3-a-zdrave-tuky",
        label: "Omega-3 a zdravé tuky",
      },
      {
        handle: "doplnky-vyzivy-probiotika-a-prebiotika",
        label: "Probiotiká a prebiotiká",
      },
    ],
  },
  "potraviny-a-napoje": {
    introSegments: [
      {
        type: "text",
        value:
          "Objavte kvalitné produkty pre každodenné varenie aj pitný režim. V ponuke nájdete ",
      },
      {
        type: "link",
        value: "čaje",
        handle: "potraviny-a-napoje-caje",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "kávu",
        handle: "potraviny-a-napoje-kava",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "sirupy a medy",
        handle: "potraviny-a-napoje-sirupy-a-medy",
      },
      { type: "text", value: " aj " },
      {
        type: "link",
        value: "špeciálne jedlé oleje",
        handle: "potraviny-a-napoje-specialne-jedle-oleje",
      },
      { type: "text", value: "." },
    ],
    preferredTiles: [
      { handle: "potraviny-a-napoje-caje", label: "Čaje" },
      { handle: "potraviny-a-napoje-kava", label: "Káva" },
      {
        handle: "potraviny-a-napoje-sirupy-a-medy",
        label: "Sirupy a medy",
      },
      {
        handle: "potraviny-a-napoje-specialne-jedle-oleje",
        label: "Špeciálne jedlé oleje",
      },
    ],
  },
  "eko-domacnost": {
    introSegments: [
      {
        type: "text",
        value:
          "EKO domácnosť prináša praktické riešenia pre zdravší domov, pohodlie aj každodenný pohyb. Pozrite si ",
      },
      {
        type: "link",
        value: "EKO doplnky",
        handle: "eko-domacnost-eko-doplnky",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "oblečenie a obuv",
        handle: "eko-domacnost-oblecenie-a-obuv",
      },
      { type: "text", value: " a " },
      {
        type: "link",
        value: "rehabilitačné pomôcky",
        handle: "eko-domacnost-rehabilitacne-pomocky",
      },
      { type: "text", value: "." },
    ],
    preferredTiles: [
      { handle: "eko-domacnost-eko-doplnky", label: "EKO doplnky" },
      {
        handle: "eko-domacnost-oblecenie-a-obuv",
        label: "Oblečenie a obuv",
      },
      {
        handle: "eko-domacnost-rehabilitacne-pomocky",
        label: "Rehabilitačné pomôcky",
      },
    ],
  },
  "ucinne-zlozky-od-a-po-z": {
    introSegments: [
      {
        type: "text",
        value:
          "Vyberajte produkty podľa konkrétnej účinnej látky a jej využitia. Preskúmajte napríklad ",
      },
      {
        type: "link",
        value: "aloe vera",
        handle: "ucinne-zlozky-od-a-po-z-aloe-vera",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "čagu",
        handle: "ucinne-zlozky-od-a-po-z-caga",
      },
      { type: "text", value: ", " },
      {
        type: "link",
        value: "pagaštan konský",
        handle: "ucinne-zlozky-od-a-po-z-pagastan-konsky",
      },
      { type: "text", value: " alebo " },
      {
        type: "link",
        value: "extrakt z pijavice lekárskej",
        handle: "ucinne-zlozky-od-a-po-z-extrakt-z-pijavice-lekarskej",
      },
      { type: "text", value: "." },
    ],
    preferredTiles: [
      { handle: "ucinne-zlozky-od-a-po-z-aloe-vera", label: "Aloe vera" },
      { handle: "ucinne-zlozky-od-a-po-z-caga", label: "Čaga" },
      {
        handle: "ucinne-zlozky-od-a-po-z-pagastan-konsky",
        label: "Pagaštan konský",
      },
      {
        handle: "ucinne-zlozky-od-a-po-z-extrakt-z-pijavice-lekarskej",
        label: "Extrakt z pijavice lekárskej",
      },
    ],
  },
  "novinky": {
    introSegments: [
      {
        type: "text",
        value:
          "Sledujte najnovšie produkty, ktoré práve pribudli do sortimentu Herbatica. Objavujte čerstvé ",
      },
      { type: "link", value: "novinky", handle: "novinky" },
      { type: "text", value: " naprieč kategóriami ako " },
      { type: "link", value: "Trápi ma", handle: "trapi-ma" },
      { type: "text", value: ", " },
      { type: "link", value: "Prírodná kozmetika", handle: "prirodna-kozmetika" },
      { type: "text", value: " alebo " },
      { type: "link", value: "Doplnky výživy", handle: "doplnky-vyzivy" },
      { type: "text", value: "." },
    ],
  },
};
