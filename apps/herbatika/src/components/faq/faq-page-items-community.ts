import type { FaqItem } from "./faq-page.types"

export const communityFaqItems = [
  {
    answer: [
      {
        text: "Ak máte pre nás obchodnú ponuku, návrh na zlepšenie, viete si predstaviť spoločný rast, rozvoj, alebo máte záujem o veľkoobchodnú spoluprácu, kontaktujte nás alebo napíšte na lenka@herbatica.sk.",
        type: "paragraph",
      },
      {
        text: "Alebo telefonicky: 00421 948 426 280.",
        type: "paragraph",
      },
      {
        text: "Tešíme sa na Vás, nech si už vyberiete akýkoľvek spôsob kontaktu s nami.",
        type: "paragraph",
      },
      {
        items: [
          {
            href: "mailto:lenka@herbatica.sk",
            label: "lenka@herbatica.sk",
          },
          { href: "tel:+421948426280", label: "00421 948 426 280" },
        ],

        type: "links",
      },
    ],
    id: "obchodna-ponuka",
    question: "Máte pre nás obchodnú ponuku?",
    updatedAt: "15.8.2019",
  },
  {
    answer: [
      {
        text: "Tešíme sa, keď máme verných zákazníkov, o ktorých sa môžeme neustále a opakovane starať. Preto sme pre Vás pripravili Herbatica newsletter, Instagram a Facebook.",
        type: "paragraph",
      },
      {
        text: "Herbatica klub",
        type: "heading",
      },
      {
        items: [
          "individuálny zvýhodnený cenník, ktorý vám zaručí neprekonateľné ceny, aj ty si týmto pádom VIP",
          "ak sa prihlásite k odberu nášho newsletteru, získavate pravidelný prísun noviniek a informácií zo sveta Herbatica. A áno, kupón na zľavu tiež",
          "dopravu neplatíte pri nákupe nad 49 €",
          "máte 14 dní na vrátenie tovaru",
          "ak získate od nás zľavový kupón, v praxi máte zľavu až 15% (zľavový kupón + VIP cenník)",
          "všetky vaše objednávky máme v evidencii, pri reklamácií nemusíte mať doklad o ich zaplatení",
        ],

        type: "list",
      },
      {
        text: "Ako sa stať členom klubu?",
        type: "heading",
      },
      {
        items: [
          "stačí sa zaregistrovať",
          "nezabudnite sa prihlásiť k odberu newsletteru",
        ],

        type: "list",
      },
      {
        items: [
          { href: "/registracia/", label: "Registrácia" },
          { href: "/newsletter/", label: "Newsletter" },
          {
            href: "https://www.instagram.com/herbatica/",
            label: "Instagram",
          },
          {
            href: "https://www.facebook.com/vasaherbatica/",
            label: "Facebook",
          },
        ],

        type: "links",
      },
    ],
    id: "byt-v-obraze",
    question:
      "Čo robiť keď chcem byť v obraze a mať stále prehľad o tom, čo má Herbatica nové, aké zmeny sa u nich dejú, aké majú práve akcie?",
    updatedAt: "15.8.2019",
  },
] satisfies FaqItem[]
