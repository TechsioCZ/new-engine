import type { StaticImageData } from "next/image"
import aboutStoreImage from "@/assets/about/1.avif"
import aboutTeamImage from "@/assets/about/2.avif"
import aboutProductsImage from "@/assets/about/3.avif"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import type { PublicRouteTarget } from "@/lib/url/public-url"

export type AboutTextLink = {
  href?: string
  label: string
  target?: PublicRouteTarget
}

export type AboutTextPart = AboutTextLink | string
export type AboutParagraph = readonly AboutTextPart[] | string

export type AboutImage = {
  alt: string
  caption?: string
  src: StaticImageData
}

export type AboutArticleSection = {
  image?: AboutImage
  paragraphs: readonly AboutParagraph[]
  title: string
}

export type AboutMilestone = {
  description: AboutParagraph
  year: string
}

export type AboutPrinciple = {
  description: string
  title: string
}

export type AboutSocialLink = {
  href: string
  icon: string
  label: string
}

export type AboutTextBlock = {
  paragraphs: readonly AboutParagraph[]
}

export type AboutPageData = {
  closingStatement: string
  contact: AboutTextBlock & {
    companyDetails: readonly string[]
    operatorTitle: string
    title: string
  }
  follow: AboutTextBlock
  hero: {
    lead: AboutParagraph
    title: string
  }
  logoMeaning: AboutTextBlock
  loyalty: AboutTextBlock
  milestones: readonly AboutMilestone[]
  milestonesTitle: string
  principles: readonly AboutPrinciple[]
  reviews: AboutTextBlock & { title: string }
  sections: readonly AboutArticleSection[]
  socialLinks: readonly AboutSocialLink[]
}

const externalLink = (label: string, href: string): AboutTextLink => ({
  href,
  label,
})

const routeLink = (
  label: string,
  target: PublicRouteTarget
): AboutTextLink => ({ label, target })

// A source handle is not a URL-registry projection. Preserve the prose while
// upstream content loaders obtain explicit publicSlug values.
const unlinked = (label: string): AboutTextLink => ({ label })

const SLOVAK_ABOUT_PAGE = {
  hero: {
    title: "O našom tíme",
    lead: [
      "Vitajte v ",
      unlinked("Herbatica"),
      ", rodinnej firme, ktorá sa zrodila z túžby priniesť ľuďom prírodné riešenia pre zdravie, krásu a well-being. Sme tu pre vás od roku 2015, aby sme vám ponúkli jedinečné produkty, ktoré spájajú tradičné liečiteľské metódy s modernými poznatkami.",
    ],
  },
  sections: [
    {
      title: "Začiatky značky Herbatica",
      paragraphs: [
        "Herbatica v jej začiatkoch nebola ničím viac než snom a víziou jej zakladateľov. Vznikla ako rodinný projekt Gajdošovcov. Vo svojich začiatkoch v r. 1991 sa firma venovala najmä obchodnej činnosti v kamennej predajni v Piešťanoch.",
        "Spoluzakladateľ Juraj, inšpirovaný svojím záujmom o alternatívnu medicínu a prírodnú kozmetiku, sa rozhodol vytvoriť miesto, kde by ľudia mohli nájsť účinné a menej známe produkty pre svoje zdravie. Nápad otvoriť e-shop skrsol v jeho hlave v dobe, keď sa intenzívne zaoberal otázkou, ako môže byť pre svoje okolie prínosný, čím mu vie prispieť a ako môže pomôcť. V prostredí bolo cítiť rodiaci sa priestor pre nové cesty k uzdraveniu, odlišné od tých tradičných.",
        [
          "Juraj mal vždy blízko k alternatívnej scéne v oblasti medicíny, ",
          unlinked("kozmetiky"),
          ", liečiteľstva a v podstate všetkému, čo možno označiť, niekedy žiaľ aj hanlivo, za alternatívu.",
        ],
        "S podporou brata Michala a mamy Eleny sa v roku 2015 zrodil e-shop Herbatica.",
        "Hlavnou motiváciou jeho zrodu bola nutnosť zmeny. Zmeny v náhľade na svoje telo, dušu, myseľ a celkové zdravie. Ďalej zmeny v zmysle myšlienkového posunu od presvedčenia, že naše zdravie je pevne dané a nemenné, k uvedomeniu si, že sme jeho aktívnymi tvorcami a máme moc ovplyvniť, kedy a ako sa uzdravíme, a to bez ohľadu na to, ako je naše zdravie zapísané v zdravotnej karte.",
        [
          "Od svojho založenia sa Herbatica formuje ako unikátna zdravotná špeciálka. Zameraná je na produkty na prírodnej báze, ktoré sú ojedinelé, málo známe, ale zato veľmi účinné pri riešení konkrétnych zdravotných problémov - ",
          unlinked("kožné problémy"),
          " (",
          unlinked("akné"),
          ", ",
          unlinked("psoriáza"),
          ", ",
          unlinked("ekzémy"),
          "), ",
          unlinked("tráviace problémy"),
          ", problémy s ",
          unlinked("kĺbmi"),
          ", ",
          unlinked("bolesti chrbtice"),
          ", ",
          unlinked("stres"),
          ", ",
          unlinked("cukrovka"),
          ", ",
          unlinked("kŕčové žily"),
          ", ",
          unlinked("vysoký krvný tlak"),
          ", oslabená ",
          unlinked("imunita"),
          " a i.",
        ],
      ],
      image: {
        alt: "Prvé regály v predajni Herbatica",
        caption:
          "Prvé regály v predajni, na foto majiteľ Herbatica Juraj Gajdoš, zdroj foto: vlastný archív.",
        src: aboutStoreImage,
      },
    },
    {
      title: "Nároky na kvalitu a spolupráca s odborníkmi",
      paragraphs: [
        [
          "Kvalita je pre nás prvoradá. Máme vysoké nároky nielen na kvalitu, ale aj štandardy, v súlade s ktorými pracujeme na vývoji našich produktov. Pre udržanie najvyššej možnej odbornosti v Herbatica spolupracujeme so širokou sieťou ",
          unlinked(
            "výrobcov, konzultantov, výživových poradcov, fyzioterapeutov a ďalších odborníkov"
          ),
          ". Spolu títo odborníci tvoria silnú základňu, na ktorú sa vieme vždy spoľahnúť, či už v otázkach zloženia produktov, kombinácie jednotlivých ",
          unlinked("účinných látok"),
          ", diagnostikovania ochorení, alebo v rámci poradenstva pri riešení konkrétnych ochorení.",
        ],
        "Spojením tradičných metód, medzi ktoré patrí napríklad ajurvéda či tradičná čínska medicína, s modernými technológiami zabezpečujeme, že naše produkty sú nielen účinné, ale aj bezpečné. Dôraz kladieme na etický prístup, čistotu surovín a ich lokálny pôvod.",
      ],
    },
    {
      title: "Vývoj vlastných produktov",
      paragraphs: [
        [
          "Od našich začiatkov v roku 2015 sme prešli dlhú cestu a firma zaznamenala významný vývoj predovšetkým v oblasti produktového portfólia. Spočiatku sme sa zameriavali na dovoz produktov z Ruska, Ukrajiny a Bieloruska. V roku 2022 sme začali vyvíjať a vyrábať vlastné produkty ",
          unlinked("pod značkou Herbatica"),
          ". Dnes ponúkame širokú škálu výrobkov - sypké zmesi, kapsuly, tobolky, kozmetické či ",
          unlinked("jedlé oleje"),
          " a krémy, gély, masti, prášky, ",
          unlinked("bylinné čaje"),
          ", kávoviny, ",
          unlinked("tinktúry"),
          " a iné. Pri vývoji produktov sa snažíme prepájať tradičné princípy a liečiteľské smery, ktoré sú tu s nami tisíce rokov, s modernými výskumami a poznatkami z nich.",
        ],
      ],
    },
    {
      title: "Náš tím",
      paragraphs: [
        "Ľudský kapitál v Herbatica vždy hral a hrá veľkú roľu. Za značkou Herbatica stojí tím nadšených profesionálov, ktorí veria v silu prírody. Každý člen nášho tímu prispieva svojimi skúsenosťami a odbornými znalosťami k tomu, aby sme vám mohli ponúknuť to najlepšie.",
        "Dbáme na výber ľudí v tíme Herbatica, vážime si ich a vytvárame pre nich bezpečné prostredie, v ktorom sa môžu sústrediť na dosahovanie pracovných cieľov a kde môžu využiť svoj jedinečný potenciál.",
        "Spoločne pracujeme na vývoji nových produktov, komunikácii s vami, našimi zákazníkmi a zabezpečení hladkého chodu nášho e-shopu. Sme si vedomí, že vďaka správnym členom tímu zabezpečíme neustále napredovanie, rast a taktiež vašu spokojnosť.",
      ],
      image: {
        alt: "Herbatica tím a kamenná predajňa v Piešťanoch",
        caption:
          "Herbatica tím vo svojich začiatkoch od r. 2015, zdroj foto: vlastný archív.",
        src: aboutTeamImage,
      },
    },
    {
      title: "Vízia do budúcnosti",
      paragraphs: [
        [
          "Našou víziou je stať sa lídrom, najlepším, nie najväčším, v oblasti prírodných produktov pre zdravie a krásu. Naďalej budeme upevňovať naše postavenie na trhu s ",
          unlinked("doplnkami stravy"),
          ", zdravými potravinami a ",
          unlinked("medicínskou kozmetikou"),
          ". Našu ponuku plánujeme rozširovať o personalizované ",
          unlinked("doplnky stravy"),
          ".",
        ],
        [
          "Budúcnosť vidíme najmä v osobnom kontakte. So snahou byť k vám ešte bližšie a ponúknuť vám viac, plánujeme otvoriť ďalšie predajne, kde vám radi poskytneme ",
          unlinked("odborné poradenstvo a diagnostiku"),
          ". Tieto priestory chceme vybaviť modernými diagnostickými nástrojmi, ako je napríklad biorezonancia, ktoré umožňujú komplexné hodnotenie vášho zdravotného stavu.",
        ],
        [
          "Sme presvedčení, že skutočná krása pramení z vnútornej harmónie tela, duše a mysle. Preto sa budeme naďalej zameriavať na produkty podporujúce vaše celkové zdravie a ",
          unlinked("vitalitu"),
          ". Pre dosiahnutie týchto cieľov sa vždy radi spojíme s ďalšími odborníkmi z rôznych oblastí, vrátane biohacking komunity. Spoločne vám budeme prinášať najnovšie poznatky a účinné riešenia pre váš blahobyt.",
        ],
      ],
      image: {
        alt: "Produkty značky Herbatica",
        caption: "Zdroj foto: vlastný archív.",
        src: aboutProductsImage,
      },
    },
  ] satisfies readonly AboutArticleSection[],
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
        routeLink("spustenie e-shopu pre Slovensko", { kind: "home" }),
        ".",
      ],
    },
    {
      year: "2017",
      description: [
        "Rozšírenie ",
        externalLink("predaja do Českej republiky", "https://www.herbatica.cz"),
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
        externalLink("maďarský trh", "https://www.herbatica.hu"),
        ".",
      ],
    },
    {
      year: "2022",
      description: [
        "Spustenie ",
        externalLink("predaja v Rumunsku", "https://www.herbatica.ro"),
        ".",
      ],
    },
    {
      year: "2024",
      description: [
        "Pod našou vlastnou ",
        unlinked("značkou Herbatica"),
        " ponúkame viac ako 50 rôznych produktov.",
      ],
    },
  ] satisfies readonly AboutMilestone[],
  milestonesTitle: "Kľúčové míľniky našej histórie",
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
        routeLink("blog", { kind: "article" }),
        ', kde servírujeme iba tie najzaujímavejšie informácie z "Herbatického sveta". Dozviete sa tam veľa zaujímavostí a získate praktické rady zo sveta alternatívnych doplnkov stravy, tradičnej i modernej liečby, prírodnej kozmetickej starostlivosti a mnoho iného.',
      ],
      [
        "Máme aj ",
        externalLink("Instagram", "https://www.instagram.com/herbatica/"),
        " a ",
        externalLink("Facebook", "https://www.facebook.com/vasaherbatica/"),
        " a pravidelne zasielame aj newsletter s novinkami a akciami. Dajte nám follow na sociálnych sieťach, alebo ",
        unlinked("sa prihláste na odber newslettera"),
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
        unlinked("pre verných zákazníkov nájdete tu"),
        ".",
      ],
    ],
  } satisfies AboutTextBlock,
  reviews: {
    title: "Hodnotenia našich zákazníkov",
    paragraphs: [
      [
        "Zaujíma vás, ako nás vnímajú ostatní zákazníci, ktorí už naše produkty či služby vyskúšali? Prečítajte si, čo o nás napísali: Tu je ",
        unlinked("hodnotenie obchodu na našom e-shope"),
        " a tu nájdete hodnotenia/recenzie na ",
        externalLink(
          "Heuréke",
          "https://obchody.heureka.sk/herbatica-sk/recenze/"
        ),
        ".",
      ],
    ],
  },
  contact: {
    title: "Kontakt",
    operatorTitle: "Prevádzkovateľ internetového obchodu",
    paragraphs: [
      "Online sme vždy pondelok až piatok od 9:00 do 15:00, s výnimkou sviatkov a dní pracovného pokoja.",
      "V Trenčíne nájdete aj kamenný obchod s prírodnou medicínou a kozmetikou, jeho adresa je: Mierové námestie 33/33, Trenčín. Vždy vám tam ochotne poradia a poslúžia. Otvorené je denne od 12:00 do 17:00.",
      [
        "Ak máte pre nás obchodnú ponuku, návrh na zlepšenie, viete si predstaviť náš spoločný rast-rozvoj alebo máte záujem o veľkoobchodnú spoluprácu, kontaktujte nás ",
        routeLink("tu", { kind: "static", page: "contact" }),
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
} as const satisfies AboutPageData

const ROMANIAN_ABOUT_PAGE = {
  hero: {
    title: "Despre echipa noastră",
    lead: [
      "Bine ați venit la ",
      unlinked("Herbatica"),
      ", o afacere de familie născută din dorința de a le oferi oamenilor soluții inspirate din natură pentru sănătate, frumusețe și stare de bine. Din 2015 selectăm produse deosebite, în care tradiția se întâlnește cu informațiile și tehnologiile moderne.",
    ],
  },
  sections: [
    {
      title: "Începuturile brandului Herbatica",
      paragraphs: [
        "La început, Herbatica a fost visul și viziunea fondatorilor săi. Povestea a pornit ca un proiect al familiei Gajdoš. Încă din 1991, familia desfășura activități comerciale într-un magazin fizic din Piešťany.",
        "Cofondatorul Juraj, pasionat de abordările complementare și de cosmetica naturală, și-a dorit să creeze un loc în care oamenii să poată descoperi produse eficiente și mai puțin cunoscute pentru îngrijirea lor. Ideea magazinului online a apărut în timp ce căuta un mod concret de a fi de folos comunității și de a face mai accesibile noi opțiuni de îngrijire.",
        [
          "Juraj a fost mereu apropiat de domeniul abordărilor complementare, de ",
          unlinked("cosmetica naturală"),
          " și de tradițiile bazate pe plante.",
        ],
        "Cu sprijinul fratelui său Michal și al mamei sale Elena, magazinul online Herbatica a prins viață în 2015.",
        "Principala motivație a fost dorința de schimbare: o perspectivă mai atentă asupra corpului, minții și stării generale de bine. Credem că fiecare persoană poate participa activ la alegerile care îi susțin stilul de viață, folosind informații corecte și recomandări potrivite nevoilor sale.",
        [
          "De la înființare, Herbatica s-a dezvoltat ca un magazin specializat în produse pe bază de ingrediente naturale, atent alese pentru diferite nevoi de îngrijire: ",
          unlinked("îngrijirea pielii"),
          ", ",
          unlinked("digestie și metabolism"),
          ", confortul ",
          unlinked("articulațiilor"),
          ", ",
          unlinked("energie și vitalitate"),
          " sau susținerea ",
          unlinked("imunității"),
          ".",
        ],
      ],
      image: {
        alt: "Primele rafturi din magazinul Herbatica",
        caption:
          "Primele rafturi din magazin; în fotografie, Juraj Gajdoš, fondator Herbatica. Sursa: arhiva proprie.",
        src: aboutStoreImage,
      },
    },
    {
      title: "Exigență pentru calitate și colaborare cu specialiști",
      paragraphs: [
        [
          "Calitatea este prioritatea noastră. Avem cerințe ridicate atât pentru produse, cât și pentru standardele după care lucrăm. Pentru a păstra un nivel înalt de competență, Herbatica colaborează cu o rețea de ",
          unlinked(
            "producători, consultanți, specialiști în nutriție, fizioterapeuți și alți profesioniști"
          ),
          ". Experiența lor ne ajută să evaluăm compozițiile, combinațiile de ",
          unlinked("ingrediente active"),
          " și informațiile de utilizare pe care le prezentăm clienților.",
        ],
        "Îmbinăm tradiții precum Ayurveda sau medicina tradițională chineză cu tehnologii și cunoștințe actuale. Punem accent pe o abordare responsabilă, pe puritatea materiilor prime și, acolo unde este posibil, pe originea lor locală.",
      ],
    },
    {
      title: "Dezvoltarea produselor proprii",
      paragraphs: [
        [
          "Din 2015 am parcurs un drum lung, iar portofoliul nostru s-a dezvoltat considerabil. La început ne concentram pe importul produselor din Rusia, Ucraina și Belarus. În 2022 am început să dezvoltăm și să producem articole ",
          unlinked("sub brandul Herbatica"),
          ". Astăzi oferim amestecuri vrac, capsule, produse cosmetice, ",
          unlinked("uleiuri alimentare"),
          ", creme, geluri, unguente, pulberi, ",
          unlinked("ceaiuri din plante"),
          ", băuturi pe bază de cafea, ",
          unlinked("tincturi"),
          " și multe altele. În dezvoltarea lor, apropiem principiile tradiționale de cercetarea și cunoștințele contemporane.",
        ],
      ],
    },
    {
      title: "Echipa noastră",
      paragraphs: [
        "Oamenii au avut întotdeauna un rol esențial la Herbatica. În spatele brandului se află o echipă de profesioniști pasionați, care cred în puterea naturii. Fiecare coleg contribuie prin experiență și cunoștințe la serviciile și selecția de produse pe care vi le oferim.",
        "Alegem cu grijă oamenii din echipă, îi apreciem și construim un mediu sigur, în care se pot concentra asupra obiectivelor și își pot folosi potențialul propriu.",
        "Lucrăm împreună la produse noi, comunicăm cu dumneavoastră și avem grijă ca magazinul online să funcționeze fără probleme. Știm că o echipă potrivită ne ajută să evoluăm constant și să vă oferim o experiență cât mai bună.",
      ],
      image: {
        alt: "Echipa Herbatica și magazinul fizic din Piešťany",
        caption:
          "Echipa Herbatica la începuturile magazinului online, din 2015. Sursa: arhiva proprie.",
        src: aboutTeamImage,
      },
    },
    {
      title: "Viziunea pentru viitor",
      paragraphs: [
        [
          "Viziunea noastră este să fim cei mai buni, nu cei mai mari, în domeniul produselor naturale pentru sănătate și frumusețe. Vom continua să ne consolidăm experiența în zona ",
          unlinked("suplimentelor nutritive"),
          ", alimentelor atent selecționate și a ",
          unlinked("cosmeticelor naturale"),
          ". Ne dorim să extindem oferta și cu soluții personalizate, dezvoltate responsabil.",
        ],
        "Vedem viitorul și prin apropierea de clienți. Ne dorim mai multe locuri în care oamenii să poată primi informații clare și recomandări despre alegerea și utilizarea produselor, întotdeauna în limitele competențelor specialiștilor implicați.",
        [
          "Credem că frumusețea autentică pornește din echilibrul dintre corp și minte. De aceea vom continua să selectăm produse care susțin starea generală de bine și ",
          unlinked("vitalitatea"),
          ". Pentru a ne atinge obiectivele, colaborăm cu specialiști din domenii diferite și aducem comunității informații actuale și soluții atent evaluate.",
        ],
      ],
      image: {
        alt: "Produse ale brandului Herbatica",
        caption: "Sursa: arhiva proprie.",
        src: aboutProductsImage,
      },
    },
  ] satisfies readonly AboutArticleSection[],
  logoMeaning: {
    paragraphs: [
      "Logo-ul Herbatica reprezintă una dintre cele mai prețioase resurse ale planetei: plantele care ne hrănesc și ne însoțesc în îngrijirea de zi cu zi. Frunzele verzi așezate în cerc simbolizează bogăția naturii și rolul plantelor în produsele din selecția noastră.",
    ],
  } satisfies AboutTextBlock,
  milestones: [
    {
      year: "2015",
      description: [
        "Înființarea Herbatica și ",
        unlinked("lansarea magazinului online pentru Slovacia"),
        ".",
      ],
    },
    {
      year: "2017",
      description: [
        "Extinderea ",
        externalLink(
          "vânzărilor în Republica Cehă",
          "https://www.herbatica.cz"
        ),
        ".",
      ],
    },
    {
      year: "2018",
      description: "Deschiderea unui magazin propriu de 100 m² în Piešťany.",
    },
    {
      year: "2018",
      description: [
        "Intrarea pe ",
        externalLink("piața din Ungaria", "https://www.herbatica.hu"),
        ".",
      ],
    },
    {
      year: "2022",
      description: [
        "Lansarea ",
        externalLink("vânzărilor în România", "https://www.herbatica.ro"),
        ".",
      ],
    },
    {
      year: "2024",
      description: [
        "Portofoliul ",
        unlinked("brandului propriu Herbatica"),
        " depășește 50 de produse.",
      ],
    },
  ] satisfies readonly AboutMilestone[],
  milestonesTitle: "Momente importante din istoria noastră",
  closingStatement:
    "Suntem aici pentru dumneavoastră și ne bucurăm să parcurgem împreună drumul către o viață mai apropiată de natură.",
  principles: [
    {
      title: "Descoperim",
      description:
        "Lumea din jurul nostru este plină de frumusețe. Nu vom înceta să o vedem, să o simțim și să o ascultăm cu atenție. Nu vrem doar să așteptăm și să privim: vrem să descoperim oameni, idei și posibilități noi.",
    },
    {
      title: "Alegem",
      description:
        "Colaborăm cu producători autentici, cu o identitate clară, o poveste și o comunitate apropiată. Oameni care își cunosc meșteșugul și își asumă munca. Experiența ne-a învățat să alegem cu atenție fiecare colaborare.",
    },
    {
      title: "Comunicăm",
      description:
        "Împărtășim ceea ce învățăm despre un stil de viață responsabil. Ne dorim ca fiecare produs pregătit și ambalat cu grijă să ajungă la persoana potrivită, care alege conștient doar ceea ce îi este cu adevărat util.",
    },
  ] satisfies readonly AboutPrinciple[],
  follow: {
    paragraphs: [
      [
        "Urmăriți ",
        routeLink("blogul nostru", { kind: "article" }),
        ", unde publicăm informații interesante din lumea Herbatica, noutăți și sfaturi practice despre suplimente nutritive, îngrijire naturală și un stil de viață echilibrat.",
      ],
      [
        "Ne găsiți și pe ",
        externalLink("Instagram", "https://www.instagram.com/herbatica/"),
        " și ",
        externalLink("Facebook", "https://www.facebook.com/vasaherbatica/"),
        ". Trimitem periodic un newsletter cu noutăți și promoții. Urmăriți-ne pe rețelele sociale sau ",
        unlinked("abonați-vă la newsletter"),
        " pentru a rămâne la curent.",
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
      "Pentru clienții care revin pregătim beneficii și oferte dedicate. Vrem să păstrăm legătura cu o comunitate care alege responsabil și apreciază produsele atent selecționate.",
    ],
  } satisfies AboutTextBlock,
  reviews: {
    title: "Opiniile clienților noștri",
    paragraphs: [
      "Doriți să aflați cum ne văd clienții care au încercat deja produsele sau serviciile noastre? Descoperiți evaluările magazinului și experiențele împărtășite de comunitatea Herbatica.",
    ],
  },
  contact: {
    title: "Contact",
    operatorTitle: "Operatorul magazinului online",
    paragraphs: [
      "Echipa noastră de asistență este disponibilă online de luni până vineri, între orele 9:00 și 15:00, cu excepția sărbătorilor legale.",
      [
        "Pentru ajutor cu o comandă sau cu alegerea produselor, scrieți-ne la ",
        externalLink("salut@herbatica.ro", "mailto:salut@herbatica.ro"),
        " sau sunați-ne la ",
        externalLink("+40 (31) 2295431", "tel:+40312295431"),
        ".",
      ],
      [
        "Dacă aveți o propunere comercială, o sugestie sau sunteți interesați de o colaborare en-gros, ne puteți contacta ",
        routeLink("aici", { kind: "static", page: "contact" }),
        ".",
      ],
      "Vă răspundem cu plăcere, indiferent de modalitatea de contact aleasă.",
    ],
    companyDetails: [
      "Herbatica s.r.o.",
      "Turzovka-Stred 422",
      "023 54 Turzovka",
      "Slovacia",
      "NI: 50 176 374",
      "CUI: 2120 198 454",
      "TVA: SK2120 198 454",
      "Societate înregistrată în scopuri de TVA.",
    ],
  },
} as const satisfies AboutPageData

const ABOUT_PAGE_DATA_BY_LOCALE: Partial<
  Record<HerbatikaLocale, AboutPageData>
> = {
  "ro-RO": ROMANIAN_ABOUT_PAGE,
  "sk-SK": SLOVAK_ABOUT_PAGE,
}

export const getAboutPageData = (
  locale: HerbatikaLocale
): AboutPageData | null => ABOUT_PAGE_DATA_BY_LOCALE[locale] ?? null
