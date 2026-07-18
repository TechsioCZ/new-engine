import {
  aboutLink,
  type AboutMilestone,
  type AboutPrinciple,
  type AboutSocialLink,
  type AboutTextBlock,
} from "./about-page.types"

export const ABOUT_PAGE_SUPPORTING = {
  logoMeaning: {
    paragraphs: [
      "Logo značky Herbatica predstavuje to najcennejšie, čo v tomto priestore máme. Sú to zdroje našej planéty - rastliny, ktoré nás nielen sýtia, ale hlavne uzdravujú. Zelené lístky v tvare kruhu symbolizujú bohatstvo prírody a liečivú silu rastlín, ktoré sú základom produktov z ponuky.",
    ],
  } satisfies AboutTextBlock,
  milestones: [
    {
      year: "2015",
      description: [
        "Založenie Herbatica a ",
        aboutLink("spustenie e-shopu pre Slovensko", "/"),
        ".",
      ],
    },
    {
      year: "2017",
      description: [
        "Rozšírenie ",
        aboutLink("predaja do Českej republiky", "https://www.herbatica.cz"),
        ".",
      ],
    },
    {
      year: "2018",
      description:
        "Otvorenie samostatnej predajne v Piešťanoch s rozlohou 100 m².",
    },
    {
      year: "2018",
      description: [
        "Vstup na ",
        aboutLink("maďarský trh", "https://www.herbatica.hu"),
        ".",
      ],
    },
    {
      year: "2022",
      description: [
        "Spustenie ",
        aboutLink("predaja v Rumunsku", "https://www.herbatica.ro"),
        ".",
      ],
    },
    {
      year: "2024",
      description: [
        "Pod našou vlastnou ",
        aboutLink("značkou Herbatica", "/znacka/herbatica/"),
        " ponúkame viac ako 50 rôznych produktov.",
      ],
    },
  ] satisfies readonly AboutMilestone[],
  closingStatement:
    "Sme tu pre vás a tešíme sa, že spolu s vami môžeme kráčať cestou k prirodzenému zdraviu a kráse.",
  principles: [
    {
      title: "Objavujeme",
      description:
        "Svet okolo nás je plný krás. Nikdy nás neprestane baviť svet naplno vidieť, cítiť a počuť. Nemôžeme čakať a prizerať sa. Musíme objavovať! Neustále objavujeme ľudí a možnosti, ktoré sú okolo nás. Sú nevyčerpateľné...",
    },
    {
      title: "Vyberáme",
      description:
        "Len takých výrobcov, ktorí sú autentickí, majú konkrétnu tvár, príbeh a svoju blízku komunitu. Majú svoje remeslo, svoju česť. Idú s kožou na trh. Život nás naučil spolupráce si starostlivo vyberať.",
    },
    {
      title: "Komunikujeme",
      description:
        "Všetko, čo sa o udržateľnosti života naučíme, zdieľame s ostatnými. Chceme mať istotu, že každý produkt, ktorý je od nás expedovaný a zabalený s láskou, si nájde toho pravého príjemcu. Príjemcu, ktorý je dostatočne bdelý na to, aby z prostredia prijímal len to, čo naozaj potrebuje.",
    },
  ] satisfies readonly AboutPrinciple[],
  follow: {
    paragraphs: [
      [
        "Sledujte náš ",
        aboutLink("blog", "/blog/"),
        ', kde servírujeme iba tie najzaujímavejšie informácie z "Herbatického sveta". Dozviete sa tam veľa zaujímavostí a získate praktické rady zo sveta alternatívnych doplnkov stravy, tradičnej i modernej liečby, prírodnej kozmetickej starostlivosti a mnoho iného.',
      ],
      [
        "Máme aj ",
        aboutLink("Instagram", "https://www.instagram.com/herbatica/"),
        " a ",
        aboutLink("Facebook", "https://www.facebook.com/vasaherbatica/"),
        " a pravidelne zasielame aj newsletter s novinkami a akciami. Dajte nám follow na sociálnych sieťach, alebo ",
        aboutLink("sa prihláste na odber newslettera", "/newsletter/"),
        " a už vám nič neutečie.",
      ],
    ],
  } satisfies AboutTextBlock,
  socialLinks: [
    {
      href: "https://www.facebook.com/vasaherbatica",
      icon: "token-icon-fb",
      label: "Facebook",
    },
    {
      href: "https://www.instagram.com/herbatica/",
      icon: "token-icon-instagram",
      label: "Instagram",
    },
    {
      href: "https://www.youtube.com/channel/UCg3xEAUM88Ewnq8UnnApznw/featured",
      icon: "token-icon-youtube",
      label: "YouTube",
    },
  ] satisfies readonly AboutSocialLink[],
  loyalty: {
    paragraphs: [
      [
        "Pre verných zákazníkov, ktorí chcú nakupovať opakovane, sme pripravili vernostný program. Veľa v ňom ušetríte a hlavne ostanete v kontakte s komunitou, ktorá tiež verí, že naša konzumná doba je udržateľná. Viac o našom programe ",
        aboutLink("pre verných zákazníkov nájdete tu", "/vernost/"),
        ".",
      ],
    ],
  } satisfies AboutTextBlock,
  reviews: {
    title: "Hodnotenia našich zákazníkov",
    paragraphs: [
      [
        "Zaujíma vás, ako nás vnímajú ostatní zákazníci, ktorí už naše produkty či služby vyskúšali? Prečítajte si, čo o nás napísali: Tu je ",
        aboutLink(
          "hodnotenie obchodu na našom e-shope",
          "/hodnotenie-obchodu/"
        ),
        " a tu nájdete hodnotenia/recenzie na ",
        aboutLink(
          "Heuréke",
          "https://obchody.heureka.sk/herbatica-sk/recenze/"
        ),
        ".",
      ],
    ],
  },
  contact: {
    title: "Kontakt",
    paragraphs: [
      "Online sme vždy pondelok až piatok od 9:00 do 15:00, s výnimkou sviatkov a dní pracovného pokoja.",
      "V Trenčíne nájdete aj kamenný obchod s prírodnou medicínou a kozmetikou, jeho adresa je: Mierové námestie 33/33, Trenčín. Vždy vám tam ochotne poradia a poslúžia. Otvorené je denne od 12:00 do 17:00.",
      [
        "Ak máte pre nás obchodnú ponuku, návrh na zlepšenie, viete si predstaviť náš spoločný rast-rozvoj alebo máte záujem o veľkoobchodnú spoluprácu, kontaktujte nás ",
        aboutLink("tu", "/napiste-nam/"),
        ".",
      ],
      "Tešíme sa na vás, nech si už vyberiete akýkoľvek spôsob kontaktu s nami.",
    ],
    companyDetails: [
      "Herbatica s.r.o.",
      "Turzovka-Stred 422",
      "023 54 Turzovka",
      "Slovensko",
      "IČO: 50 176 374",
      "DIČ: 2120 198 454",
      "IČ DPH: SK2120 198 454",
      "Sme platci DPH.",
    ],
  },
} as const
