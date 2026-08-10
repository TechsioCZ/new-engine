import { communityFaqItems } from "./faq-page-items-community"
import type { FaqItem } from "./faq-page.types"

export const primaryFaqItems = [
  {
    answer: [
      {
        text: "Radi by ste vedeli, v akom stave je Vaša objednávka? Dozviete sa to rýchlo a ľahko:",
        type: "paragraph",
      },
      {
        items: [
          "Prihláste sa do svojho zákazníckeho konta.",
          'Vpravo zvoľte možnosť "Moje objednávky".',
          "Uvidíte prehľadnú tabuľku so stavom Vašej objednávky.",
        ],
        ordered: true,
        type: "list",
      },
      {
        items: [
          {
            href: "https://cdn.myshoptet.com/usr/www.herbatica.sk/user/documents/upload/Sledovanie%20stavu%20objedn%C3%A1vky.png",
            label: "Ukážka sledovania stavu objednávky",
          },
        ],

        type: "links",
      },
    ],
    id: "stav-objednavky",
    question: "V akom stave je Vaša objednávka?",
    updatedAt: "24.9.2018",
  },
  {
    answer: [
      {
        text: "Občas máme problém s dostupnosťou produktov, predsa len Rusko je ďalej ako sa môže zdať a ak produkty aj hneď objednáme, tak ich dodanie trvá. A potom sa nás často pýtate, kedy bude produkt skladom.",
        type: "paragraph",
      },
      {
        text: "Vytvorili sme preto pre Vás funkciu Strážny pes, ktorá Vás bude informovať o tom, že je produkt opäť v našej ponuke skladom.",
        type: "paragraph",
      },
      {
        text: "Máte tak možnosť vedieť hneď z prvej ruky, kedy sme produkt naskladnili. A budete si tak môcť hneď objednať svoj vytúžený produkt.",
        type: "paragraph",
      },
      {
        text: 'Stačí, ak kliknete na "Pošlite mi mail, ak bude skladom", následne zadáte svoj mail a my Vám odošleme automatický mail, keď tovar naskladníme.',
        type: "paragraph",
      },
      {
        text: "Prvý krok",
        type: "heading",
      },
      {
        items: [
          {
            href: "https://cdn.myshoptet.com/usr/www.herbatica.sk/user/documents/upload/AwesomeScreenshot-www-herbatica-sk-specialna-starostlivost-o-plet-doktor-vedov-horsky-cistotel-extrakt-z-lastovicnika-na-bradavice-1-2ml--2019-08-15_9_40.png",
            label: "Ukážka prvého kroku",
          },
        ],

        type: "links",
      },
      {
        text: "Druhý krok",
        type: "heading",
      },
      {
        items: [
          {
            href: "https://cdn.myshoptet.com/usr/www.herbatica.sk/user/documents/upload/AwesomeScreenshot-www-herbatica-sk-specialna-starostlivost-o-plet-doktor-vedov-horsky-cistotel-extrakt-z-lastovicnika-na-bradavice-1-2ml--2019-08-15_9_41.png",
            label: "Ukážka druhého kroku",
          },
        ],

        type: "links",
      },
    ],
    id: "vypredany-tovar",
    question: "Chcete byť informovaný, keď bude vypredaný tovar opäť skladom?",
    updatedAt: "15.8.2019",
  },
  {
    answer: [
      {
        text: "Veľmi často sa stretávame s tým, že Vám nejdú uplatniť zľavové kupóny.",
        type: "paragraph",
      },
      {
        text: "Pred tým ako nám budete volať alebo písať, sa prosím, presvedčte o tom, či máte kupón správne gramaticky napísaný a zadávajte ho bez úvodzoviek v ktorých bol zadaný.",
        type: "paragraph",
      },
      {
        text: "Ak problém pretrváva pošlite nám problémový kupón na mail ahoj@herbatica.sk alebo ho napíšte do poznámky pre predajcu a pozrieme sa na to.",
        type: "paragraph",
      },
      {
        items: [
          {
            href: "mailto:ahoj@herbatica.sk",
            label: "ahoj@herbatica.sk",
          },
        ],

        type: "links",
      },
    ],
    id: "zlavovy-kupon",
    question: "Nedá sa Vám uplatniť zľavový kupón?",
    updatedAt: "15.8.2019",
  },
  ...communityFaqItems,
] satisfies FaqItem[]
