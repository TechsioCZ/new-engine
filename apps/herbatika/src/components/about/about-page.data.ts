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

const CZECH_ABOUT_PAGE = {
  hero: {
    title: "O našem týmu",
    lead: [
      "Vítejte v ",
      unlinked("Herbatica"),
      ", rodinné značce, která vznikla z přání nabízet lidem přírodou inspirované možnosti péče o zdraví, krásu a celkovou pohodu. Od roku 2015 vybíráme produkty, v nichž se tradiční přístupy potkávají se současnými znalostmi.",
    ],
  },
  sections: [
    {
      title: "Začátky značky Herbatica",
      paragraphs: [
        "Na začátku byla Herbatica snem a vizí svých zakladatelů. Vznikla jako rodinný projekt Gajdošových, kteří se už od roku 1991 věnovali obchodu v kamenné prodejně v Piešťanech.",
        "Spoluzakladatel Juraj se dlouhodobě zajímal o přírodní kosmetiku a doplňkové přístupy k péči o zdraví. Chtěl vytvořit místo, kde lidé snadno objeví účinné a méně známé produkty a dostanou k nim srozumitelné informace. Z této myšlenky postupně vyrostl internetový obchod.",
        [
          "Jurajovi byly vždy blízké oblasti přírodní ",
          unlinked("kosmetiky"),
          ", bylinářství a tradičních postupů založených na rostlinách.",
        ],
        "S podporou bratra Michala a maminky Eleny vznikl v roce 2015 e-shop Herbatica.",
        "Hlavní motivací byla chuť přinést změnu v tom, jak lidé přemýšlejí o svém těle, mysli a celkové pohodě. Věříme, že informovaná rozhodnutí a odpovědná péče mohou být důležitou součástí každodenního životního stylu.",
        [
          "Od svého založení se Herbatica rozvíjí jako specializovaný obchod s pečlivě vybranými produkty na přírodní bázi pro různé potřeby: ",
          unlinked("péči o pokožku"),
          ", podporu ",
          unlinked("trávení"),
          ", pohodlí ",
          unlinked("kloubů"),
          ", ",
          unlinked("energii a vitalitu"),
          " nebo podporu ",
          unlinked("imunity"),
          ".",
        ],
      ],
      image: {
        alt: "První regály v prodejně Herbatica",
        caption:
          "První regály v prodejně; na fotografii zakladatel Herbatica Juraj Gajdoš. Zdroj: vlastní archiv.",
        src: aboutStoreImage,
      },
    },
    {
      title: "Důraz na kvalitu a spolupráce s odborníky",
      paragraphs: [
        [
          "Kvalita je pro nás zásadní. Vysoké požadavky klademe na produkty i na standardy, podle nichž pracujeme. Herbatica spolupracuje se sítí ",
          unlinked(
            "výrobců, konzultantů, výživových poradců, fyzioterapeutů a dalších odborníků"
          ),
          ". Jejich zkušenosti nám pomáhají posuzovat složení, kombinace ",
          unlinked("účinných látek"),
          " a informace o správném používání produktů.",
        ],
        "Propojujeme tradice, jako je ájurvéda nebo tradiční čínská medicína, se současnými technologiemi a poznatky. Důraz klademe na odpovědný přístup, čistotu surovin a tam, kde je to možné, také na jejich místní původ.",
      ],
    },
    {
      title: "Vývoj vlastních produktů",
      paragraphs: [
        [
          "Od roku 2015 jsme ušli dlouhou cestu a výrazně rozšířili své portfolio. Zpočátku jsme se soustředili na dovoz produktů z Ruska, Ukrajiny a Běloruska. V roce 2022 jsme začali vyvíjet a vyrábět produkty ",
          unlinked("pod značkou Herbatica"),
          ". Dnes nabízíme sypké směsi, kapsle, kosmetiku, ",
          unlinked("jedlé oleje"),
          ", krémy, gely, masti, prášky, ",
          unlinked("bylinné čaje"),
          ", kávové nápoje, ",
          unlinked("tinktury"),
          " a další výrobky. Při jejich vývoji propojujeme tradiční principy se současným výzkumem a znalostmi.",
        ],
      ],
    },
    {
      title: "Náš tým",
      paragraphs: [
        "Lidé měli v Herbatica vždy zásadní roli. Za značkou stojí tým nadšených profesionálů, kteří věří v sílu přírody. Každý člen přispívá zkušenostmi a odbornými znalostmi k tomu, abychom mohli nabídnout kvalitní výběr produktů a spolehlivé služby.",
        "Členy týmu vybíráme pečlivě, vážíme si jich a vytváříme bezpečné prostředí, ve kterém se mohou soustředit na své cíle a naplno využít vlastní potenciál.",
        "Společně pracujeme na nových produktech, komunikujeme se zákazníky a staráme se o hladký chod e-shopu. Víme, že správný tým je základem dalšího rozvoje i dobré zákaznické zkušenosti.",
      ],
      image: {
        alt: "Tým Herbatica a kamenná prodejna v Piešťanech",
        caption:
          "Tým Herbatica v začátcích internetového obchodu od roku 2015. Zdroj: vlastní archiv.",
        src: aboutTeamImage,
      },
    },
    {
      title: "Vize do budoucna",
      paragraphs: [
        [
          "Naší vizí je být nejlepší, nikoli největší, v oblasti přírodních produktů pro zdraví a krásu. Nadále chceme prohlubovat zkušenosti se ",
          unlinked("doplňky stravy"),
          ", pečlivě vybranými potravinami a ",
          unlinked("přírodní kosmetikou"),
          ". Nabídku chceme rozvíjet odpovědně a s ohledem na skutečné potřeby zákazníků.",
        ],
        "Budoucnost vidíme také v bližším kontaktu se zákazníky. Chceme vytvářet místa a služby, kde lidé získají jasné informace a pomoc s výběrem i používáním produktů, vždy v mezích odbornosti zapojených specialistů.",
        [
          "Věříme, že opravdová krása vyrůstá z rovnováhy těla a mysli. Proto se budeme dál soustředit na produkty podporující celkovou pohodu a ",
          unlinked("vitalitu"),
          ". Spolupráce s odborníky z různých oblastí nám pomáhá přinášet komunitě aktuální poznatky a pečlivě posouzená řešení.",
        ],
      ],
      image: {
        alt: "Produkty značky Herbatica",
        caption: "Zdroj: vlastní archiv.",
        src: aboutProductsImage,
      },
    },
  ] satisfies readonly AboutArticleSection[],
  logoMeaning: {
    paragraphs: [
      "Logo Herbatica představuje jeden z nejcennějších zdrojů naší planety: rostliny, které nás živí a provázejí v každodenní péči. Zelené listy uspořádané do kruhu symbolizují bohatství přírody a význam rostlin v našem výběru produktů.",
    ],
  } satisfies AboutTextBlock,
  milestones: [
    {
      year: "2015",
      description: [
        "Založení Herbatica a ",
        unlinked("spuštění internetového obchodu pro Slovensko"),
        ".",
      ],
    },
    {
      year: "2017",
      description: [
        "Rozšíření ",
        routeLink("prodeje do České republiky", { kind: "home" }),
        ".",
      ],
    },
    {
      year: "2018",
      description:
        "Otevření samostatné prodejny o rozloze 100 m² v Piešťanech.",
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
        "Zahájení ",
        externalLink("prodeje v Rumunsku", "https://www.herbatica.ro"),
        ".",
      ],
    },
    {
      year: "2024",
      description: [
        "Portfolio ",
        unlinked("vlastní značky Herbatica"),
        " překročilo 50 produktů.",
      ],
    },
  ] satisfies readonly AboutMilestone[],
  milestonesTitle: "Důležité milníky naší historie",
  closingStatement:
    "Jsme tu pro vás a těší nás, že můžeme společně kráčet cestou k životu bližšímu přírodě.",
  principles: [
    {
      title: "Objevujeme",
      description:
        "Svět kolem nás je plný krásy. Nepřestává nás bavit vnímat ho všemi smysly. Nechceme jen čekat a přihlížet; objevujeme nové lidi, nápady a možnosti.",
    },
    {
      title: "Vybíráme",
      description:
        "Spolupracujeme s autentickými výrobci, kteří mají jasnou tvář, příběh a blízkou komunitu. Znají své řemeslo a za svou prací si stojí. Zkušenost nás naučila vybírat každou spolupráci pečlivě.",
    },
    {
      title: "Komunikujeme",
      description:
        "Sdílíme to, co se učíme o odpovědném životním stylu. Chceme, aby každý pečlivě připravený produkt našel správného člověka, který si vědomě vybírá jen to, co skutečně potřebuje.",
    },
  ] satisfies readonly AboutPrinciple[],
  follow: {
    paragraphs: [
      [
        "Sledujte náš ",
        routeLink("blog", { kind: "article" }),
        ", kde zveřejňujeme novinky a praktické rady ze světa doplňků stravy, přírodní péče a vyváženého životního stylu.",
      ],
      [
        "Najdete nás také na ",
        externalLink("Instagramu", "https://www.instagram.com/herbatica/"),
        " a ",
        externalLink("Facebooku", "https://www.facebook.com/vasaherbatica/"),
        ". Pravidelně posíláme newsletter s novinkami a akcemi. Sledujte nás na sociálních sítích nebo ",
        unlinked("se přihlaste k odběru newsletteru"),
        ", aby vám nic neuniklo.",
      ],
    ],
  } satisfies AboutTextBlock,
  socialLinks: SLOVAK_ABOUT_PAGE.socialLinks,
  loyalty: {
    paragraphs: [
      "Pro zákazníky, kteří se vracejí, připravujeme výhody a speciální nabídky. Chceme zůstat v kontaktu s komunitou, která nakupuje odpovědně a oceňuje pečlivě vybrané produkty.",
    ],
  } satisfies AboutTextBlock,
  reviews: {
    title: "Hodnocení našich zákazníků",
    paragraphs: [
      "Zajímá vás, jak nás vnímají zákazníci, kteří už vyzkoušeli naše produkty nebo služby? Prohlédněte si hodnocení obchodu a zkušenosti sdílené komunitou Herbatica.",
    ],
  },
  contact: {
    title: "Kontakt",
    operatorTitle: "Kontakt pro český trh",
    paragraphs: [
      "S dotazy k objednávce, výběru produktů nebo spolupráci se obraťte na zákaznickou podporu pro český trh.",
      [
        "Aktuální způsoby spojení a provozní dobu najdete na naší ",
        routeLink("kontaktní stránce", { kind: "static", page: "contact" }),
        ".",
      ],
      "Kontaktní stránka vždy uvádí údaje platné pro trh, na kterém právě nakupujete.",
      "Na vaše dotazy rádi odpovíme.",
    ],
    companyDetails: [
      "Zákaznická podpora Herbatica pro Českou republiku",
      "Aktuální kontaktní a provozní údaje jsou uvedeny na kontaktní stránce.",
    ],
  },
} as const satisfies AboutPageData

const HUNGARIAN_ABOUT_PAGE = {
  hero: {
    title: "Csapatunkról",
    lead: [
      "Üdvözöljük a ",
      unlinked("Herbatica"),
      " oldalán! Családi márkánk azért jött létre, hogy természet ihlette megoldásokat kínáljon az egészség, a szépség és a jó közérzet mindennapi támogatásához. 2015 óta olyan termékeket válogatunk, amelyekben a hagyományos szemlélet korszerű ismeretekkel találkozik.",
    ],
  },
  sections: [
    {
      title: "A Herbatica márka kezdetei",
      paragraphs: [
        "A Herbatica kezdetben az alapítók álma és jövőképe volt. A Gajdoš család közös projektjeként indult; a család már 1991-től kereskedelmi tevékenységet folytatott egy pöstyéni üzletben.",
        "Juraj társalapító régóta érdeklődött a természetes kozmetikumok és az egészségtudatos, kiegészítő szemléletek iránt. Olyan helyet szeretett volna létrehozni, ahol az emberek hatékony, kevésbé ismert termékeket fedezhetnek fel, és közérthető tájékoztatást kapnak róluk. Ebből az elképzelésből nőtt ki a webáruház.",
        [
          "Jurajhoz mindig közel állt a természetes ",
          unlinked("kozmetikumok"),
          ", a gyógynövények és a növényi hagyományok világa.",
        ],
        "Testvére, Michal és édesanyja, Elena támogatásával 2015-ben megszületett a Herbatica webáruház.",
        "A fő motiváció a változtatás igénye volt: tudatosabban tekinteni a testre, az elmére és az általános jóllétre. Hiszünk abban, hogy a hiteles információkra épülő döntések és a felelős gondoskodás fontos részei lehetnek a mindennapoknak.",
        [
          "A Herbatica megalakulása óta természetes alapú, gondosan válogatott termékek szaküzletévé fejlődött. Kínálatunk többek között a ",
          unlinked("bőrápolás"),
          ", az ",
          unlinked("emésztés"),
          ", az ",
          unlinked("ízületek komfortja"),
          ", az ",
          unlinked("energia és vitalitás"),
          ", valamint az ",
          unlinked("immunrendszer támogatása"),
          " területére terjed ki.",
        ],
      ],
      image: {
        alt: "A Herbatica üzlet első polcai",
        caption:
          "Az üzlet első polcai; a fényképen Juraj Gajdoš, a Herbatica alapítója. Forrás: saját archívum.",
        src: aboutStoreImage,
      },
    },
    {
      title: "Minőség és szakértői együttműködés",
      paragraphs: [
        [
          "Számunkra a minőség az első. Magas követelményeket támasztunk a termékekkel és a munkánkat meghatározó szabványokkal szemben. A Herbatica ",
          unlinked(
            "gyártókkal, tanácsadókkal, táplálkozási szakemberekkel, gyógytornászokkal és más szakértőkkel"
          ),
          " működik együtt. Tapasztalatuk segít az összetételek, a ",
          unlinked("hatóanyagok"),
          " kombinációi és a használati információk gondos értékelésében.",
        ],
        "Az ájurvédához és a hagyományos kínai orvosláshoz hasonló tradíciókat korszerű technológiákkal és ismeretekkel kapcsoljuk össze. Fontos számunkra a felelős szemlélet, az alapanyagok tisztasága és lehetőség szerint helyi eredete.",
      ],
    },
    {
      title: "Saját termékek fejlesztése",
      paragraphs: [
        [
          "2015 óta hosszú utat tettünk meg, és jelentősen bővítettük kínálatunkat. Kezdetben orosz, ukrán és belarusz termékek importjára összpontosítottunk. 2022-ben megkezdtük a ",
          unlinked("Herbatica márkanév alatt"),
          " forgalmazott saját termékek fejlesztését és gyártását. Ma ömlesztett keverékeket, kapszulákat, kozmetikumokat, ",
          unlinked("étkezési olajokat"),
          ", krémeket, géleket, kenőcsöket, porokat, ",
          unlinked("gyógyteákat"),
          ", kávéitalokat, ",
          unlinked("tinktúrákat"),
          " és más termékeket kínálunk. Fejlesztésük során a hagyományos elveket korszerű kutatási eredményekkel ötvözzük.",
        ],
      ],
    },
    {
      title: "Csapatunk",
      paragraphs: [
        "A Herbatica életében mindig meghatározó szerepet játszottak az emberek. A márka mögött lelkes szakemberek csapata áll, akik hisznek a természet erejében. Minden munkatárs tapasztalatával és tudásával járul hozzá a gondos termékválasztékhoz és a megbízható kiszolgáláshoz.",
        "Körültekintően választjuk ki kollégáinkat, megbecsüljük őket, és olyan biztonságos környezetet teremtünk, ahol céljaikra összpontosíthatnak és kibontakoztathatják egyéni képességeiket.",
        "Együtt dolgozunk új termékeken, kapcsolatot tartunk vásárlóinkkal, és gondoskodunk a webáruház zökkenőmentes működéséről. Tudjuk, hogy a megfelelő csapat a folyamatos fejlődés és a jó vásárlói élmény alapja.",
      ],
      image: {
        alt: "A Herbatica csapata és a pöstyéni üzlet",
        caption:
          "A Herbatica csapata a webáruház 2015-ben kezdődő első éveiben. Forrás: saját archívum.",
        src: aboutTeamImage,
      },
    },
    {
      title: "Jövőképünk",
      paragraphs: [
        [
          "Célunk, hogy ne a legnagyobbak, hanem a legjobbak legyünk a természetes egészség- és szépségápolási termékek területén. Tovább mélyítjük tapasztalatainkat az ",
          unlinked("étrend-kiegészítők"),
          ", a gondosan válogatott élelmiszerek és a ",
          unlinked("természetes kozmetikumok"),
          " világában. Kínálatunkat felelősen, a valós vásárlói igényekhez igazítva szeretnénk bővíteni.",
        ],
        "A jövőt a vásárlókkal való szorosabb kapcsolatban is látjuk. Olyan helyeket és szolgáltatásokat szeretnénk teremteni, ahol az érdeklődők világos információt és segítséget kapnak a termékek kiválasztásához és használatához, mindig az érintett szakemberek kompetenciájának keretein belül.",
        [
          "Hiszünk abban, hogy a valódi szépség a test és az elme egyensúlyából fakad. Ezért továbbra is az általános jóllétet és a ",
          unlinked("vitalitást"),
          " támogató termékekre összpontosítunk. A különböző területek szakértőivel való együttműködés révén korszerű ismereteket és gondosan értékelt megoldásokat kínálunk közösségünknek.",
        ],
      ],
      image: {
        alt: "Herbatica márkájú termékek",
        caption: "Forrás: saját archívum.",
        src: aboutProductsImage,
      },
    },
  ] satisfies readonly AboutArticleSection[],
  logoMeaning: {
    paragraphs: [
      "A Herbatica logója bolygónk egyik legértékesebb erőforrását, a tápláló és mindennapi gondoskodásunkat kísérő növényeket jeleníti meg. A körbe rendezett zöld levelek a természet gazdagságát és a növények kínálatunkban betöltött szerepét jelképezik.",
    ],
  } satisfies AboutTextBlock,
  milestones: [
    {
      year: "2015",
      description: [
        "A Herbatica megalapítása és ",
        unlinked("a szlovákiai webáruház elindítása"),
        ".",
      ],
    },
    {
      year: "2017",
      description: [
        "Az értékesítés ",
        externalLink("kiterjesztése Csehországra", "https://www.herbatica.cz"),
        ".",
      ],
    },
    {
      year: "2018",
      description: "Egy 100 m²-es önálló üzlet megnyitása Pöstyénben.",
    },
    {
      year: "2018",
      description: [
        "Belépés a ",
        routeLink("magyar piacra", { kind: "home" }),
        ".",
      ],
    },
    {
      year: "2022",
      description: [
        "Az értékesítés ",
        externalLink("elindítása Romániában", "https://www.herbatica.ro"),
        ".",
      ],
    },
    {
      year: "2024",
      description: [
        "A ",
        unlinked("saját Herbatica márka"),
        " kínálata meghaladta az 50 terméket.",
      ],
    },
  ] satisfies readonly AboutMilestone[],
  milestonesTitle: "Történetünk fontos mérföldkövei",
  closingStatement:
    "Azért dolgozunk, hogy együtt haladhassunk egy természetközelibb élet felé.",
  principles: [
    {
      title: "Felfedezünk",
      description:
        "A körülöttünk lévő világ tele van szépséggel. Soha nem unjuk meg, hogy minden érzékünkkel megtapasztaljuk. Nem akarunk csupán várni és figyelni: új embereket, ötleteket és lehetőségeket fedezünk fel.",
    },
    {
      title: "Válogatunk",
      description:
        "Olyan hiteles gyártókkal működünk együtt, akiknek saját arculatuk, történetük és közösségük van. Ismerik a mesterségüket, és vállalják munkájuk eredményét. A tapasztalat megtanított bennünket arra, hogy minden együttműködést körültekintően válasszunk ki.",
    },
    {
      title: "Kommunikálunk",
      description:
        "Megosztjuk mindazt, amit a felelős életmódról tanulunk. Azt szeretnénk, hogy minden gondosan előkészített termék ahhoz jusson el, aki tudatosan csak azt választja, amire valóban szüksége van.",
    },
  ] satisfies readonly AboutPrinciple[],
  follow: {
    paragraphs: [
      [
        "Kövesse ",
        routeLink("blogunkat", { kind: "article" }),
        ", ahol újdonságokat és gyakorlati tanácsokat osztunk meg az étrend-kiegészítők, a természetes ápolás és a kiegyensúlyozott életmód világából.",
      ],
      [
        "Megtalál minket az ",
        externalLink("Instagramon", "https://www.instagram.com/herbatica/"),
        " és a ",
        externalLink("Facebookon", "https://www.facebook.com/vasaherbatica/"),
        " is. Rendszeresen küldünk hírlevelet hírekkel és akciókkal. Kövessen minket a közösségi médiában, vagy ",
        unlinked("iratkozzon fel hírlevelünkre"),
        ", hogy ne maradjon le semmiről.",
      ],
    ],
  } satisfies AboutTextBlock,
  socialLinks: SLOVAK_ABOUT_PAGE.socialLinks,
  loyalty: {
    paragraphs: [
      "Visszatérő vásárlóink számára külön előnyöket és ajánlatokat készítünk. Kapcsolatban szeretnénk maradni azzal a közösséggel, amely felelősen vásárol és értékeli a gondosan válogatott termékeket.",
    ],
  } satisfies AboutTextBlock,
  reviews: {
    title: "Vásárlóink véleménye",
    paragraphs: [
      "Kíváncsi arra, hogyan látnak minket azok, akik már kipróbálták termékeinket vagy szolgáltatásainkat? Ismerje meg a Herbatica közössége által megosztott értékeléseket és tapasztalatokat.",
    ],
  },
  contact: {
    title: "Kapcsolat",
    operatorTitle: "Kapcsolat a magyar piachoz",
    paragraphs: [
      "Rendeléssel, termékválasztással vagy együttműködéssel kapcsolatos kérdésével forduljon a magyar piac ügyfélszolgálatához.",
      [
        "Az aktuális elérhetőségeket és ügyfélfogadási időt a ",
        routeLink("kapcsolati oldalon", { kind: "static", page: "contact" }),
        " találja.",
      ],
      "A kapcsolati oldal mindig az éppen használt piachoz tartozó érvényes adatokat mutatja.",
      "Szívesen válaszolunk kérdéseire.",
    ],
    companyDetails: [
      "Herbatica ügyfélszolgálat Magyarország számára",
      "Az aktuális kapcsolati és működési adatok a kapcsolati oldalon találhatók.",
    ],
  },
} as const satisfies AboutPageData

const ABOUT_PAGE_DATA_BY_LOCALE: Partial<
  Record<HerbatikaLocale, AboutPageData>
> = {
  "cs-CZ": CZECH_ABOUT_PAGE,
  "hu-HU": HUNGARIAN_ABOUT_PAGE,
  "ro-RO": ROMANIAN_ABOUT_PAGE,
  "sk-SK": SLOVAK_ABOUT_PAGE,
}

export const getAboutPageData = (
  locale: HerbatikaLocale
): AboutPageData | null => ABOUT_PAGE_DATA_BY_LOCALE[locale] ?? null
