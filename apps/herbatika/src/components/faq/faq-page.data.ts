import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import type { PublicRouteTarget } from "@/lib/url/public-url"

export type FaqLink = {
  href?: string
  label: string
  target?: PublicRouteTarget
}

export type FaqAnswerBlock =
  | {
      type: "heading"
      text: string
    }
  | {
      type: "paragraph"
      text: string
    }
  | {
      type: "list"
      ordered?: boolean
      items: string[]
    }
  | {
      type: "links"
      items: FaqLink[]
    }

export type FaqItem = {
  id: string
  question: string
  updatedAt: string
  answer: FaqAnswerBlock[]
}

export type FaqPageData = {
  title: string
  intro: string
  items: FaqItem[]
}

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
          {
            label: "Registrácia",
            target: { kind: "account", section: "register" },
          },
          { label: "Newsletter" },
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
            label: "Reklamačný formulár",
            target: { kind: "static", page: "returns" },
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
            label: "Dokumenty k stiahnutiu",
            target: { kind: "static", page: "terms" },
          },
        ],
      },
    ],
  },
] satisfies FaqItem[]

export const faqItemCount = faqItems.length

const roFaqItems = [
  {
    id: "stav-objednavky",
    question: "În ce stadiu se află comanda dumneavoastră?",
    updatedAt: "24.9.2018",
    answer: [
      {
        type: "paragraph",
        text: "Doriți să aflați în ce stadiu se află comanda dumneavoastră? Puteți verifica rapid și ușor:",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Autentificați-vă în contul de client.",
          "Selectați opțiunea „Comenzile mele” din partea dreaptă.",
          "Veți vedea un tabel clar cu stadiul comenzii dumneavoastră.",
        ],
      },
      {
        type: "links",
        items: [{ label: "Urmăriți comanda din contul de client" }],
      },
    ],
  },
  {
    id: "vypredany-tovar",
    question: "Doriți să fiți anunțat când un produs epuizat revine în stoc?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Uneori apar întârzieri în aprovizionarea anumitor produse, mai ales atunci când acestea vin de la furnizori îndepărtați. De aceea primim frecvent întrebări despre data revenirii lor în stoc.",
      },
      {
        type: "paragraph",
        text: "Am pregătit funcția de alertă de stoc, care vă anunță când produsul dorit este din nou disponibil în oferta noastră.",
      },
      {
        type: "paragraph",
        text: "Astfel aflați imediat când produsul a fost reaprovizionat și îl puteți comanda fără să verificați periodic pagina.",
      },
      {
        type: "paragraph",
        text: "Apăsați „Anunțați-mă când revine în stoc”, introduceți adresa de e-mail, iar noi vă vom trimite automat un mesaj după reaprovizionare.",
      },
      { type: "heading", text: "Primul pas" },
      {
        type: "links",
        items: [{ label: "Deschideți alerta de stoc pe pagina produsului" }],
      },
      { type: "heading", text: "Al doilea pas" },
      {
        type: "links",
        items: [{ label: "Introduceți adresa de e-mail și confirmați alerta" }],
      },
    ],
  },
  {
    id: "zlavovy-kupon",
    question: "Nu puteți aplica un cupon de reducere?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Se întâmplă ca unele cupoane de reducere să nu poată fi aplicate din prima încercare.",
      },
      {
        type: "paragraph",
        text: "Înainte să ne sunați sau să ne scrieți, verificați dacă ați introdus codul exact așa cum a fost primit, fără ghilimele și fără spații suplimentare.",
      },
      {
        type: "paragraph",
        text: "Dacă problema persistă, trimiteți cuponul la salut@herbatica.ro sau adăugați-l în nota pentru comerciant, iar noi îl vom verifica.",
      },
      {
        type: "links",
        items: [
          {
            href: "mailto:salut@herbatica.ro",
            label: "salut@herbatica.ro",
          },
        ],
      },
    ],
  },
  {
    id: "obchodna-ponuka",
    question: "Aveți o propunere de afaceri pentru noi?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Dacă aveți o propunere comercială, o idee de îmbunătățire sau sunteți interesat de o colaborare ori de achiziții angro, scrieți-ne la salut@herbatica.ro.",
      },
      {
        type: "paragraph",
        text: "Ne puteți contacta și telefonic la +40 (31) 2295431.",
      },
      {
        type: "paragraph",
        text: "Așteptăm cu interes mesajul sau apelul dumneavoastră.",
      },
      {
        type: "links",
        items: [
          {
            href: "mailto:salut@herbatica.ro",
            label: "salut@herbatica.ro",
          },
          { href: "tel:+40312295431", label: "+40 (31) 2295431" },
        ],
      },
    ],
  },
  {
    id: "byt-v-obraze",
    question:
      "Cum puteți fi la curent cu noutățile, schimbările și promoțiile Herbatica?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Ne bucurăm să avem clienți fideli și să le putem oferi mereu informații utile. Pentru dumneavoastră am pregătit newsletterul Herbatica și paginile noastre de Instagram și Facebook.",
      },
      { type: "heading", text: "Clubul Herbatica" },
      {
        type: "list",
        items: [
          "o listă de prețuri preferențiale individuală, cu avantaje pentru membrii VIP",
          "noutăți și informații regulate din universul Herbatica prin newsletter, inclusiv cupoane atunci când sunt disponibile",
          "pragul pentru transport gratuit este afișat în RON în coș, conform ofertei în vigoare",
          "aveți la dispoziție 14 zile pentru returnarea produselor, în condițiile prevăzute de politica de retur",
          "cupoanele de reducere primite pot fi folosite conform condițiilor afișate pentru fiecare campanie",
          "comenzile din cont rămân în istoricul dumneavoastră și pot ajuta la identificarea unei achiziții",
        ],
      },
      { type: "heading", text: "Cum deveniți membru al clubului?" },
      {
        type: "list",
        items: [
          "creați-vă un cont",
          "abonați-vă la newsletter pentru a primi noutățile",
        ],
      },
      {
        type: "links",
        items: [
          {
            label: "Înregistrare",
            target: { kind: "account", section: "register" },
          },
          { label: "Newsletter" },
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
    question: "Doriți să cumpărați personal de la un magazin fizic?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Informațiile despre punctele de vânzare fizice pot varia în funcție de țară și perioadă.",
      },
      {
        type: "paragraph",
        text: "Pentru opțiunile disponibile clienților din România, contactați echipa Herbatica România.",
      },
      {
        type: "paragraph",
        text: "Ne puteți suna la +40 (31) 2295431 sau ne puteți scrie la salut@herbatica.ro.",
      },
      {
        type: "links",
        items: [
          { href: "tel:+40312295431", label: "+40 (31) 2295431" },
          {
            href: "mailto:salut@herbatica.ro",
            label: "salut@herbatica.ro",
          },
        ],
      },
    ],
  },
  {
    id: "affiliate",
    question: "Doriți să colaborați cu Herbatica în calitate de afiliat?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Colaborăm cu parteneri afiliați prin platforma Dognet. Vă puteți înregistra pe platformă și ne puteți contacta prin această rețea.",
      },
      {
        type: "paragraph",
        text: "Pentru un alt tip de colaborare, scrieți-ne la salut@herbatica.ro.",
      },
      {
        type: "links",
        items: [
          { href: "https://www.dognet.com/", label: "Dognet" },
          {
            href: "mailto:salut@herbatica.ro",
            label: "salut@herbatica.ro",
          },
        ],
      },
    ],
  },
  {
    id: "eurobio-lab",
    question:
      "Cum se interpretează marcajul termenului de valabilitate pentru produsele EUROBIO LAB?",
    updatedAt: "8.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Explicațiile privind marcajul termenului de valabilitate al produselor EUROBIO LAB sunt disponibile într-un document explicativ.",
      },
      {
        type: "links",
        items: [
          {
            href: "mailto:salut@herbatica.ro?subject=Document%20EUROBIO%20LAB",
            label: "Solicitați documentul explicativ",
          },
        ],
      },
    ],
  },
  {
    id: "vratenie-reklamacia",
    question:
      "Cum procedați pentru returnarea sau reclamarea unui produs și unde găsiți formularele?",
    updatedAt: "12.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Satisfacția dumneavoastră este importantă pentru noi și ne străduim să ne facem treaba cât mai bine. Totuși, pot apărea situații care trebuie remediate. În calitate de client, puteți solicita returnarea sau puteți depune o reclamație pentru un produs, în condițiile aplicabile.",
      },
      {
        type: "paragraph",
        text: "Dacă doriți să reclamați un produs, găsiți informațiile și formularul necesar pe pagina dedicată retururilor și reclamațiilor.",
      },
      {
        type: "links",
        items: [
          {
            label: "Formular de reclamație",
            target: { kind: "static", page: "returns" },
          },
        ],
      },
    ],
  },
  {
    id: "odstupenie-od-zmluvy",
    question:
      "Cum vă puteți retrage din contractul de vânzare și unde găsiți formularele?",
    updatedAt: "12.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Dacă doriți să vă retrageți din contractul de vânzare, documentele disponibile pot fi consultate în termenii și condițiile magazinului.",
      },
      {
        type: "links",
        items: [
          {
            label: "Documente și condiții",
            target: { kind: "static", page: "terms" },
          },
        ],
      },
    ],
  },
] satisfies FaqItem[]

const csFaqItems = [
  {
    id: "stav-objednavky",
    question: "V jakém stavu je vaše objednávka?",
    updatedAt: "24.9.2018",
    answer: [
      {
        type: "paragraph",
        text: "Chcete zjistit, v jakém stavu je vaše objednávka? Ověříte to rychle a snadno:",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Přihlaste se ke svému zákaznickému účtu.",
          "Zvolte možnost „Moje objednávky“.",
          "V přehledné tabulce uvidíte aktuální stav objednávky.",
        ],
      },
      {
        type: "links",
        items: [{ label: "Sledovat objednávku v zákaznickém účtu" }],
      },
    ],
  },
  {
    id: "vypredany-tovar",
    question: "Chcete vědět, až bude vyprodané zboží znovu skladem?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "U některých produktů se může doplnění zásob zpozdit, zejména pokud přicházejí od vzdálenějších dodavatelů. Proto se často ptáte, kdy budou opět dostupné.",
      },
      {
        type: "paragraph",
        text: "K tomu slouží upozornění na dostupnost, které vám dá vědět, jakmile se vybraný produkt vrátí do nabídky.",
      },
      {
        type: "paragraph",
        text: "O naskladnění se tak dozvíte bez pravidelného kontrolování stránky a produkt můžete rovnou objednat.",
      },
      {
        type: "paragraph",
        text: "Klikněte na „Upozornit, až bude skladem“, zadejte svůj e-mail a po doplnění zásob vám automaticky pošleme zprávu.",
      },
      { type: "heading", text: "První krok" },
      {
        type: "links",
        items: [{ label: "Otevřete upozornění na stránce produktu" }],
      },
      { type: "heading", text: "Druhý krok" },
      {
        type: "links",
        items: [{ label: "Zadejte e-mail a potvrďte upozornění" }],
      },
    ],
  },
  {
    id: "zlavovy-kupon",
    question: "Nedaří se vám uplatnit slevový kupón?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Někdy se může stát, že slevový kupón nejde použít na první pokus.",
      },
      {
        type: "paragraph",
        text: "Zkontrolujte, zda jste kód zadali přesně tak, jak jste ho obdrželi, bez uvozovek a bez mezer navíc. Ověřte také podmínky akce a platnost kupónu.",
      },
      {
        type: "paragraph",
        text: "Pokud potíže přetrvávají, pošlete kód zákaznické podpoře nebo ho uveďte do poznámky k objednávce. Rádi ho prověříme.",
      },
      {
        type: "links",
        items: [
          {
            label: "Kontaktovat zákaznickou podporu",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "obchodna-ponuka",
    question: "Máte pro nás obchodní nabídku?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Máte obchodní nabídku, návrh na zlepšení nebo zájem o velkoobchodní spolupráci? Pošlete nám stručné představení a kontaktní údaje.",
      },
      {
        type: "paragraph",
        text: "Aktuální způsob spojení pro český trh najdete na kontaktní stránce.",
      },
      {
        type: "paragraph",
        text: "Každou smysluplnou nabídku si rádi projdeme a ozveme se vám.",
      },
      {
        type: "links",
        items: [
          {
            label: "Kontaktní stránka",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "byt-v-obraze",
    question: "Jak mít přehled o novinkách a akcích Herbatica?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Těší nás zájem stálých zákazníků. Novinky, praktické informace a aktuální nabídky sdílíme v newsletteru a na sociálních sítích Herbatica.",
      },
      { type: "heading", text: "Klub Herbatica" },
      {
        type: "list",
        items: [
          "členské výhody a ceny podle právě platné nabídky",
          "pravidelné novinky a informace z Herbatica prostřednictvím newsletteru",
          "aktuální hranice dopravy zdarma se v košíku zobrazuje v CZK",
          "podmínky vrácení zboží najdete vždy v platných pravidlech pro český trh",
          "slevové kupóny lze použít podle podmínek konkrétní kampaně",
          "objednávky zůstávají uložené v historii zákaznického účtu",
        ],
      },
      { type: "heading", text: "Jak se stát členem klubu?" },
      {
        type: "list",
        items: [
          "vytvořte si zákaznický účet",
          "přihlaste se k newsletteru, pokud chcete dostávat novinky",
        ],
      },
      {
        type: "links",
        items: [
          {
            label: "Registrace",
            target: { kind: "account", section: "register" },
          },
          { label: "Newsletter" },
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
    question: "Chcete nakoupit osobně v kamenné prodejně?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Dostupnost kamenných prodejen a výdejních míst se může v jednotlivých zemích a obdobích lišit.",
      },
      {
        type: "paragraph",
        text: "Aktuální možnosti pro zákazníky v České republice vám potvrdí místní zákaznická podpora.",
      },
      {
        type: "paragraph",
        text: "Před cestou si na kontaktní stránce ověřte adresu, otevírací dobu a dostupné služby.",
      },
      {
        type: "links",
        items: [
          {
            label: "Ověřit aktuální kontakty",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "affiliate",
    question: "Chcete spolupracovat s Herbatica jako affiliate partner?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "S affiliate partnery spolupracujeme prostřednictvím sítě Dognet. Zaregistrujte se v této síti a oslovte nás jejím prostřednictvím.",
      },
      {
        type: "paragraph",
        text: "Pokud máte zájem o jiný druh spolupráce, využijte kontaktní stránku pro český trh.",
      },
      {
        type: "links",
        items: [
          { href: "https://www.dognet.com/", label: "Dognet" },
          {
            label: "Kontakt pro spolupráci",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "eurobio-lab",
    question:
      "Jak číst označení data spotřeby na produktech výrobce EUROBIO LAB?",
    updatedAt: "8.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Vysvětlení označení doby použitelnosti produktů EUROBIO LAB je k dispozici v samostatném informačním dokumentu.",
      },
      {
        type: "links",
        items: [
          {
            label: "Vyžádat informační dokument",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "vratenie-reklamacia",
    question: "Jak postupovat při vrácení nebo reklamaci zboží?",
    updatedAt: "12.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Na vaší spokojenosti nám záleží. Pokud se s objednávkou nebo produktem něco nepovede, můžete požádat o vrácení zboží nebo podat reklamaci podle pravidel platných pro český trh.",
      },
      {
        type: "paragraph",
        text: "Postup, potřebné údaje a dostupné formuláře najdete na stránce vrácení a reklamací.",
      },
      {
        type: "links",
        items: [
          {
            label: "Vrácení a reklamace",
            target: { kind: "static", page: "returns" },
          },
        ],
      },
    ],
  },
  {
    id: "odstupenie-od-zmluvy",
    question: "Jak odstoupit od kupní smlouvy?",
    updatedAt: "12.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Informace o odstoupení od kupní smlouvy a dostupné dokumenty najdete v obchodních podmínkách platných pro český trh.",
      },
      {
        type: "links",
        items: [
          {
            label: "Obchodní podmínky a dokumenty",
            target: { kind: "static", page: "terms" },
          },
        ],
      },
    ],
  },
] satisfies FaqItem[]

const huFaqItems = [
  {
    id: "stav-objednavky",
    question: "Hol tart a rendelése?",
    updatedAt: "24.9.2018",
    answer: [
      {
        type: "paragraph",
        text: "Szeretné megtudni rendelése aktuális állapotát? Gyorsan és egyszerűen ellenőrizheti:",
      },
      {
        type: "list",
        ordered: true,
        items: [
          "Jelentkezzen be vásárlói fiókjába.",
          "Válassza a „Rendeléseim” lehetőséget.",
          "Az áttekintő táblázatban látni fogja rendelése aktuális állapotát.",
        ],
      },
      {
        type: "links",
        items: [{ label: "Rendelés követése a vásárlói fiókban" }],
      },
    ],
  },
  {
    id: "vypredany-tovar",
    question:
      "Szeretne értesítést kapni, ha egy elfogyott termék újra kapható?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Egyes termékek utánpótlása késhet, különösen ha távolabbi beszállítóktól érkeznek. Ezért gyakran kérdezik tőlünk, mikor lesznek ismét elérhetők.",
      },
      {
        type: "paragraph",
        text: "A készletértesítő funkció jelzi, amikor a kiválasztott termék visszakerül kínálatunkba.",
      },
      {
        type: "paragraph",
        text: "Így az oldal rendszeres ellenőrzése nélkül értesülhet a feltöltésről, és azonnal leadhatja rendelését.",
      },
      {
        type: "paragraph",
        text: "Kattintson az „Értesítést kérek, ha újra kapható” gombra, adja meg e-mail-címét, és a készlet feltöltésekor automatikus üzenetet küldünk.",
      },
      { type: "heading", text: "Első lépés" },
      {
        type: "links",
        items: [{ label: "Nyissa meg a készletértesítőt a termékoldalon" }],
      },
      { type: "heading", text: "Második lépés" },
      {
        type: "links",
        items: [
          { label: "Adja meg e-mail-címét, majd erősítse meg az értesítést" },
        ],
      },
    ],
  },
  {
    id: "zlavovy-kupon",
    question: "Nem sikerül beváltani a kedvezménykupont?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Előfordulhat, hogy egy kedvezménykupon elsőre nem alkalmazható.",
      },
      {
        type: "paragraph",
        text: "Ellenőrizze, hogy a kódot pontosan a kapott formában, idézőjelek és felesleges szóközök nélkül írta-e be. Nézze meg a kampány feltételeit és a kupon érvényességét is.",
      },
      {
        type: "paragraph",
        text: "Ha a probléma továbbra is fennáll, küldje el a kódot az ügyfélszolgálatnak, vagy írja be a rendelés megjegyzésébe. Szívesen ellenőrizzük.",
      },
      {
        type: "links",
        items: [
          {
            label: "Kapcsolat az ügyfélszolgálattal",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "obchodna-ponuka",
    question: "Üzleti ajánlata van számunkra?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Üzleti ajánlata, fejlesztési javaslata vagy nagykereskedelmi együttműködési elképzelése van? Küldjön rövid bemutatkozást és elérhetőséget.",
      },
      {
        type: "paragraph",
        text: "A magyar piachoz tartozó aktuális kapcsolatfelvételi módot a kapcsolati oldalon találja.",
      },
      {
        type: "paragraph",
        text: "Minden érdemi ajánlatot szívesen átnézünk, és visszajelzünk.",
      },
      {
        type: "links",
        items: [
          {
            label: "Kapcsolati oldal",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "byt-v-obraze",
    question: "Hogyan követheti a Herbatica újdonságait és akcióit?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Örülünk visszatérő vásárlóink érdeklődésének. Az újdonságokat, hasznos információkat és aktuális ajánlatokat hírlevelünkben és a Herbatica közösségi oldalain osztjuk meg.",
      },
      { type: "heading", text: "Herbatica klub" },
      {
        type: "list",
        items: [
          "tagsági előnyök és árak az éppen érvényes ajánlat szerint",
          "rendszeres hírek és információk a Herbatica világából hírlevélben",
          "az ingyenes szállítás aktuális értékhatára a kosárban, HUF pénznemben jelenik meg",
          "a visszaküldési feltételeket mindig a magyar piac aktuális szabályzata tartalmazza",
          "a kedvezménykuponok az adott kampány feltételei szerint használhatók fel",
          "a rendelések megmaradnak a vásárlói fiók előzményeiben",
        ],
      },
      { type: "heading", text: "Hogyan lehet a klub tagja?" },
      {
        type: "list",
        items: [
          "hozzon létre vásárlói fiókot",
          "iratkozzon fel a hírlevélre, ha értesülni szeretne az újdonságokról",
        ],
      },
      {
        type: "links",
        items: [
          {
            label: "Regisztráció",
            target: { kind: "account", section: "register" },
          },
          { label: "Hírlevél" },
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
    question: "Személyesen vásárolna egy üzletben?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "A fizikai üzletek és átvételi pontok elérhetősége országonként és időszakonként változhat.",
      },
      {
        type: "paragraph",
        text: "A Magyarországon elérhető aktuális lehetőségekről a helyi ügyfélszolgálat ad tájékoztatást.",
      },
      {
        type: "paragraph",
        text: "Indulás előtt ellenőrizze a címet, a nyitvatartást és az elérhető szolgáltatásokat a kapcsolati oldalon.",
      },
      {
        type: "links",
        items: [
          {
            label: "Aktuális elérhetőségek ellenőrzése",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "affiliate",
    question: "Affiliate partnerként működne együtt a Herbaticával?",
    updatedAt: "15.8.2019",
    answer: [
      {
        type: "paragraph",
        text: "Affiliate partnereinkkel a Dognet hálózaton keresztül működünk együtt. Regisztráljon a hálózatban, és azon keresztül vegye fel velünk a kapcsolatot.",
      },
      {
        type: "paragraph",
        text: "Más típusú együttműködés esetén használja a magyar piac kapcsolati oldalát.",
      },
      {
        type: "links",
        items: [
          { href: "https://www.dognet.com/", label: "Dognet" },
          {
            label: "Kapcsolat együttműködéshez",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "eurobio-lab",
    question:
      "Hogyan kell értelmezni az EUROBIO LAB termékek lejárati jelölését?",
    updatedAt: "8.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Az EUROBIO LAB termékek lejárati jelölésének magyarázata külön tájékoztató dokumentumban érhető el.",
      },
      {
        type: "links",
        items: [
          {
            label: "Tájékoztató dokumentum kérése",
            target: { kind: "static", page: "contact" },
          },
        ],
      },
    ],
  },
  {
    id: "vratenie-reklamacia",
    question: "Hogyan küldhet vissza vagy reklamálhat meg egy terméket?",
    updatedAt: "12.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Fontos számunkra elégedettsége. Ha a rendeléssel vagy a termékkel kapcsolatban probléma merül fel, a magyar piacra érvényes szabályok szerint kérhet visszaküldést vagy nyújthat be reklamációt.",
      },
      {
        type: "paragraph",
        text: "A lépéseket, a szükséges adatokat és az elérhető űrlapokat a visszaküldési és reklamációs oldalon találja.",
      },
      {
        type: "links",
        items: [
          {
            label: "Visszaküldés és reklamáció",
            target: { kind: "static", page: "returns" },
          },
        ],
      },
    ],
  },
  {
    id: "odstupenie-od-zmluvy",
    question: "Hogyan állhat el az adásvételi szerződéstől?",
    updatedAt: "12.3.2021",
    answer: [
      {
        type: "paragraph",
        text: "Az elállásról és az elérhető dokumentumokról a magyar piacra érvényes általános szerződési feltételekben talál tájékoztatást.",
      },
      {
        type: "links",
        items: [
          {
            label: "Szerződési feltételek és dokumentumok",
            target: { kind: "static", page: "terms" },
          },
        ],
      },
    ],
  },
] satisfies FaqItem[]

const FAQ_PAGE_DATA_BY_LOCALE: Partial<Record<HerbatikaLocale, FaqPageData>> = {
  "cs-CZ": {
    title: "Často kladené otázky",
    intro: "Jasné odpovědi na nejčastější otázky o nakupování na Herbatica.",
    items: csFaqItems,
  },
  "hu-HU": {
    title: "Gyakran ismételt kérdések",
    intro:
      "Közérthető válaszok a Herbatica webáruházban történő vásárlás leggyakoribb kérdéseire.",
    items: huFaqItems,
  },
  "sk-SK": {
    title: "Často kladené otázky",
    intro: "Prehľad odpovedí z pôvodného Herbatica FAQ.",
    items: faqItems,
  },
  "ro-RO": {
    title: "Întrebări frecvente",
    intro:
      "Răspunsuri clare la cele mai frecvente întrebări despre cumpărăturile pe Herbatica.",
    items: roFaqItems,
  },
}

export const getFaqPageData = (locale: HerbatikaLocale): FaqPageData | null =>
  FAQ_PAGE_DATA_BY_LOCALE[locale] ?? null
