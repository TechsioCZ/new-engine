export type FaqLink = {
  href: string;
  label: string;
};

export type FaqAnswerBlock =
  | {
      type: "heading";
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      ordered?: boolean;
      items: string[];
    }
  | {
      type: "links";
      items: FaqLink[];
    };

export type FaqItem = {
  id: string;
  question: string;
  updatedAt: string;
  answer: FaqAnswerBlock[];
};

export const faqItems = [
  {
    id: "stav-objednavky",
    question: "V akom stave je Vaša objednávka?",
    updatedAt: "24.9.2018",
    answer: [
      {
        type: "paragraph",
        text: "Radi by ste vedeli, v akom stave je Vaša objednávka? Dozviete sa to rýchlo a ľahko:",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Prihláste sa do svojho zákazníckeho konta.",
          'Vpravo zvoľte možnosť "Moje objednávky".',
          "Uvidíte prehľadnú tabuľku so stavom Vašej objednávky.",
        ],
      },
      {
        type: "links",
        items: [
          {
            href: "https://cdn.myshoptet.com/usr/www.herbatica.sk/user/documents/upload/Sledovanie%20stavu%20objedn%C3%A1vky.png",
            label: "Ukážka sledovania stavu objednávky",
          },
        ],
      },
    ],
  },
  {
    id: "vypredany-tovar",
    question: "Chcete byť informovaný, keď bude vypredaný tovar opäť skladom?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Občas máme problém s dostupnosťou produktov, predsa len Rusko je ďalej ako sa môže zdať a ak produkty aj hneď objednáme, tak ich dodanie trvá. A potom sa nás často pýtate, kedy bude produkt skladom.",
      },
      {
        type: "paragraph",
        text: "Vytvorili sme preto pre Vás funkciu Strážny pes, ktorá Vás bude informovať o tom, že je produkt opäť v našej ponuke skladom.",
      },
      {
        type: "paragraph",
        text: "Máte tak možnosť vedieť hneď z prvej ruky, kedy sme produkt naskladnili. A budete si tak môcť hneď objednať svoj vytúžený produkt.",
      },
      {
        type: "paragraph",
        text: 'Stačí, ak kliknete na "Pošlite mi mail, ak bude skladom", následne zadáte svoj mail a my Vám odošleme automatický mail, keď tovar naskladníme.',
      },
      {
        type: "heading",
        text: "Prvý krok",
      },
      {
        type: "links",
        items: [
          {
            href: "https://cdn.myshoptet.com/usr/www.herbatica.sk/user/documents/upload/AwesomeScreenshot-www-herbatica-sk-specialna-starostlivost-o-plet-doktor-vedov-horsky-cistotel-extrakt-z-lastovicnika-na-bradavice-1-2ml--2019-08-15_9_40.png",
            label: "Ukážka prvého kroku",
          },
        ],
      },
      {
        type: "heading",
        text: "Druhý krok",
      },
      {
        type: "links",
        items: [
          {
            href: "https://cdn.myshoptet.com/usr/www.herbatica.sk/user/documents/upload/AwesomeScreenshot-www-herbatica-sk-specialna-starostlivost-o-plet-doktor-vedov-horsky-cistotel-extrakt-z-lastovicnika-na-bradavice-1-2ml--2019-08-15_9_41.png",
            label: "Ukážka druhého kroku",
          },
        ],
      },
    ],
  },
  {
    id: "zlavovy-kupon",
    question: "Nedá sa Vám uplatniť zľavový kupón?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Veľmi často sa stretávame s tým, že Vám nejdú uplatniť zľavové kupóny.",
      },
      {
        type: "paragraph",
        text: "Pred tým ako nám budete volať alebo písať, sa prosím, presvedčte o tom, či máte kupón správne gramaticky napísaný a zadávajte ho bez úvodzoviek v ktorých bol zadaný.",
      },
      {
        type: "paragraph",
        text: "Ak problém pretrváva pošlite nám problémový kupón na mail ahoj@herbatica.sk alebo ho napíšte do poznámky pre predajcu a pozrieme sa na to.",
      },
      {
        type: "links",
        items: [
          {
            href: "mailto:ahoj@herbatica.sk",
            label: "ahoj@herbatica.sk",
          },
        ],
      },
    ],
  },
  {
    id: "obchodna-ponuka",
    question: "Máte pre nás obchodnú ponuku?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Ak máte pre nás obchodnú ponuku, návrh na zlepšenie, viete si predstaviť spoločný rast, rozvoj, alebo máte záujem o veľkoobchodnú spoluprácu, kontaktujte nás alebo napíšte na lenka@herbatica.sk.",
      },
      {
        type: "paragraph",
        text: "Alebo telefonicky: 00421 948 426 280.",
      },
      {
        type: "paragraph",
        text: "Tešíme sa na Vás, nech si už vyberiete akýkoľvek spôsob kontaktu s nami.",
      },
      {
        type: "links",
        items: [
          {
            href: "mailto:lenka@herbatica.sk",
            label: "lenka@herbatica.sk",
          },
          { href: "tel:+421948426280", label: "00421 948 426 280" },
        ],
      },
    ],
  },
  {
    id: "byt-v-obraze",
    question:
      "Čo robiť keď chcem byť v obraze a mať stále prehľad o tom, čo má Herbatica nové, aké zmeny sa u nich dejú, aké majú práve akcie?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Tešíme sa, keď máme verných zákazníkov, o ktorých sa môžeme neustále a opakovane starať. Preto sme pre Vás pripravili Herbatica newsletter, Instagram a Facebook.",
      },
      {
        type: "heading",
        text: "Herbatica klub",
      },
      {
        type: "list",
        items: [
          "individuálny zvýhodnený cenník, ktorý vám zaručí neprekonateľné ceny, aj ty si týmto pádom VIP",
          "ak sa prihlásite k odberu nášho newsletteru, získavate pravidelný prísun noviniek a informácií zo sveta Herbatica. A áno, kupón na zľavu tiež",
          "dopravu neplatíte pri nákupe nad 49 €",
          "máte 14 dní na vrátenie tovaru",
          "ak získate od nás zľavový kupón, v praxi máte zľavu až 15% (zľavový kupón + VIP cenník)",
          "všetky vaše objednávky máme v evidencii, pri reklamácií nemusíte mať doklad o ich zaplatení",
        ],
      },
      {
        type: "heading",
        text: "Ako sa stať členom klubu?",
      },
      {
        type: "list",
        items: [
          "stačí sa zaregistrovať",
          "nezabudnite sa prihlásiť k odberu newsletteru",
        ],
      },
      {
        type: "links",
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
      },
    ],
  },
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
] satisfies FaqItem[];

export const faqItemCount = faqItems.length;
