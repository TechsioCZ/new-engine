import type { FaqItem } from "./faq-page.types"

export const secondaryFaqItems = [
  {
    id: "kamenna-predajna",
    question:
      "Chcel by som si kúpiť veci osobne, máte aj predajňu, kde by som Vás navštívil?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "V Piešťanoch nájdete aj kamenný obchod s ruskou medicínou a kozmetikou, jeho adresa je Winterova 38, Piešťany.",
      },
      {
        type: "paragraph",
        text: "Vždy Vám tam ochotne poradia a poslúžia.",
      },
      {
        type: "paragraph",
        text: "Otvorené majú denne od 9:00 do 18:00, telefón na predajňu je 0948 494 122.",
      },
      {
        type: "links",
        items: [
          {
            href: "tel:+421948494122",
            label: "0948 494 122",
          },
        ],
      },
    ],
  },
  {
    id: "affiliate",
    question: "Máte záujem o spoluprácu s Herbatica ako affiliate partner?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Momentálne spolupracujeme s affiliate partnermi cez službu Dognet. Zaregistrujte sa tam a oslovte nás prostredníctvom tejto siete.",
      },
      {
        type: "paragraph",
        text: "Máte záujem o iný druh spolupráce? Napíšte nám na ahoj@herbatica.sk.",
      },
      {
        type: "links",
        items: [
          { href: "https://www.dognet.sk/", label: "Dognet" },
          { href: "mailto:ahoj@herbatica.sk", label: "ahoj@herbatica.sk" },
        ],
      },
    ],
  },
  {
    id: "eurobio-lab",
    question:
      "Vysvetlenie označenia spotreby na produktoch produkcie výrobcu: EUROBIO LAB",
    updatedAt: "8.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Vysvetlenie označenia spotreby na produktoch produkcie výrobcu EUROBIO LAB nájdete v dokumente na stiahnutie.",
      },
      {
        type: "links",
        items: [
          {
            href: "https://www.herbatica.sk/user/documents/upload/Batch%20number%20NEW.docx",
            label: "Stiahnuť vysvetlenie označenia",
          },
        ],
      },
    ],
  },
  {
    id: "vratenie-reklamacia",
    question:
      "Ako postupovať pri vrátení a reklamácii tovaru + formuláre na stiahnutie",
    updatedAt: "12.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Na vašej spokojnosti nám zaleží a snažíme sa našu prácu robiť najlepšie ako vieme. Spokojnosť zákazníka je pre nás prvoradou, niekedy sa však môže stať, že dôjde k omylu. Ak sa tak stane, sme pripravení napraviť každý problém. Ako zákazník môžete využiť možnosť vrátenia a reklamácie produktu.",
      },
      {
        type: "paragraph",
        text: "V prípade, ak chcete svoj tovar reklamovať, reklamačný formulár nájdete na stránke reklamačného poriadku.",
      },
      {
        type: "links",
        items: [
          {
            href: "/reklamacny-poriadok/",
            label: "Reklamačný formulár",
          },
        ],
      },
    ],
  },
  {
    id: "odstupenie-od-zmluvy",
    question: "Ako môžem odstúpiť od kúpnej zmluvy + formuláre na stiahnutie",
    updatedAt: "12.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "V prípade ak chcete od kúpnej zmluvy odstúpiť, dokumenty k stiahnutiu nájdete v obchodných podmienkach.",
      },
      {
        type: "links",
        items: [
          {
            href: "/obchodne-podmienky/",
            label: "Dokumenty k stiahnutiu",
          },
        ],
      },
    ],
  },
] satisfies FaqItem[]
