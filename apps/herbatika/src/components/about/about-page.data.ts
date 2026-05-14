import type { StaticImageData } from "next/image";
import aboutStoreImage from "@/assets/about/1.avif";
import aboutTeamImage from "@/assets/about/2.avif";
import aboutProductsImage from "@/assets/about/3.avif";
import { routes } from "@/lib/routes";

export type AboutTextLink = {
  href: string;
  label: string;
};

export type AboutTextPart = AboutTextLink | string;
export type AboutParagraph = readonly AboutTextPart[] | string;

export type AboutImage = {
  alt: string;
  caption?: string;
  src: StaticImageData;
};

type AboutArticleSection = {
  image?: AboutImage;
  paragraphs: readonly AboutParagraph[];
  title: string;
};

type AboutMilestone = {
  description: AboutParagraph;
  year: string;
};

type AboutPrinciple = {
  description: string;
  title: string;
};

type AboutSocialLink = AboutTextLink & {
  icon: string;
};

type AboutTextBlock = {
  paragraphs: readonly AboutParagraph[];
};

const link = (label: string, href: string): AboutTextLink => ({
  href,
  label,
});

export const ABOUT_PAGE = {
  hero: {
    title: "O našom tíme",
    lead: [
      "Vitajte v ",
      link("Herbatica", routes.brand.detail("herbatica")),
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
          link("kozmetiky", "/kozmetika-a-zdravie-2/"),
          ", liečiteľstva a v podstate všetkému, čo možno označiť, niekedy žiaľ aj hanlivo, za alternatívu.",
        ],
        "S podporou brata Michala a mamy Eleny sa v roku 2015 zrodil e-shop Herbatica.",
        "Hlavnou motiváciou jeho zrodu bola nutnosť zmeny. Zmeny v náhľade na svoje telo, dušu, myseľ a celkové zdravie. Ďalej zmeny v zmysle myšlienkového posunu od presvedčenia, že naše zdravie je pevne dané a nemenné, k uvedomeniu si, že sme jeho aktívnymi tvorcami a máme moc ovplyvniť, kedy a ako sa uzdravíme, a to bez ohľadu na to, ako je naše zdravie zapísané v zdravotnej karte.",
        [
          "Od svojho založenia sa Herbatica formuje ako unikátna zdravotná špeciálka. Zameraná je na produkty na prírodnej báze, ktoré sú ojedinelé, málo známe, ale zato veľmi účinné pri riešení konkrétnych zdravotných problémov - ",
          link("kožné problémy", "/kozne-problemy/"),
          " (",
          link("akné", "/akne/"),
          ", ",
          link("psoriáza", "/psoriaza-a-lupienka/"),
          ", ",
          link("ekzémy", "/ekzem/"),
          "), ",
          link("tráviace problémy", "/zaludok-a-pecen/"),
          ", problémy s ",
          link("kĺbmi", "/klby-a-pohybovy-aparat/"),
          ", ",
          link("bolesti chrbtice", "/bolest-chrbta-seknutie-v-krizoch/"),
          ", ",
          link("stres", "/stres-a-nervozita/"),
          ", ",
          link("cukrovka", "/cukrovka/"),
          ", ",
          link("kŕčové žily", "/krcove-zily/"),
          ", ",
          link("vysoký krvný tlak", "/vysoky-krvny-tlak/"),
          ", oslabená ",
          link("imunita", "/imunita/"),
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
          link(
            "výrobcov, konzultantov, výživových poradcov, fyzioterapeutov a ďalších odborníkov",
            "/odborne-poradenstvo-a-diagnostika/",
          ),
          ". Spolu títo odborníci tvoria silnú základňu, na ktorú sa vieme vždy spoľahnúť, či už v otázkach zloženia produktov, kombinácie jednotlivých ",
          link("účinných látok", "/aktivnelatky/"),
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
          link("pod značkou Herbatica", routes.brand.detail("herbatica")),
          ". Dnes ponúkame širokú škálu výrobkov - sypké zmesi, kapsuly, tobolky, kozmetické či ",
          link("jedlé oleje", "/specialne-jedle-oleje/"),
          " a krémy, gély, masti, prášky, ",
          link("bylinné čaje", "/caje/"),
          ", kávoviny, ",
          link("tinktúry", "/bylinne-extrakty/"),
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
          link("doplnkami stravy", "/doplnky-stravy/"),
          ", zdravými potravinami a ",
          link("medicínskou kozmetikou", "/kozmetika-a-zdravie-2/"),
          ". Našu ponuku plánujeme rozširovať o personalizované ",
          link("doplnky stravy", "/doplnky-vyzivy/"),
          ".",
        ],
        [
          "Budúcnosť vidíme najmä v osobnom kontakte. So snahou byť k vám ešte bližšie a ponúknuť vám viac, plánujeme otvoriť ďalšie predajne, kde vám radi poskytneme ",
          link("odborné poradenstvo a diagnostiku", "/odborne-poradenstvo-a-diagnostika/"),
          ". Tieto priestory chceme vybaviť modernými diagnostickými nástrojmi, ako je napríklad biorezonancia, ktoré umožňujú komplexné hodnotenie vášho zdravotného stavu.",
        ],
        [
          "Sme presvedčení, že skutočná krása pramení z vnútornej harmónie tela, duše a mysle. Preto sa budeme naďalej zameriavať na produkty podporujúce vaše celkové zdravie a ",
          link("vitalitu", "/energia-a-vitalita/"),
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
        link("spustenie e-shopu pre Slovensko", "/"),
        ".",
      ],
    },
    {
      year: "2017",
      description: [
        "Rozšírenie ",
        link("predaja do Českej republiky", "https://www.herbatica.cz"),
        ".",
      ],
    },
    {
      year: "2018",
      description: "Otvorenie samostatnej predajne v Piešťanoch s rozlohou 100 m².",
    },
    {
      year: "2018",
      description: ["Vstup na ", link("maďarský trh", "https://www.herbatica.hu"), "."],
    },
    {
      year: "2022",
      description: ["Spustenie ", link("predaja v Rumunsku", "https://www.herbatica.ro"), "."],
    },
    {
      year: "2024",
      description: [
        "Pod našou vlastnou ",
        link("značkou Herbatica", routes.brand.detail("herbatica")),
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
        link("blog", routes.blog.index),
        ', kde servírujeme iba tie najzaujímavejšie informácie z "Herbatického sveta". Dozviete sa tam veľa zaujímavostí a získate praktické rady zo sveta alternatívnych doplnkov stravy, tradičnej i modernej liečby, prírodnej kozmetickej starostlivosti a mnoho iného.',
      ],
      [
        "Máme aj ",
        link("Instagram", "https://www.instagram.com/herbatica/"),
        " a ",
        link("Facebook", "https://www.facebook.com/vasaherbatica/"),
        " a pravidelne zasielame aj newsletter s novinkami a akciami. Dajte nám follow na sociálnych sieťach, alebo ",
        link("sa prihláste na odber newslettera", routes.cms.detail("newsletter")),
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
        link("pre verných zákazníkov nájdete tu", "/vernost/"),
        ".",
      ],
    ],
  } satisfies AboutTextBlock,
  reviews: {
    title: "Hodnotenia našich zákazníkov",
    paragraphs: [
      [
        "Zaujíma vás, ako nás vnímajú ostatní zákazníci, ktorí už naše produkty či služby vyskúšali? Prečítajte si, čo o nás napísali: Tu je ",
        link("hodnotenie obchodu na našom e-shope", "/hodnotenie-obchodu/"),
        " a tu nájdete hodnotenia/recenzie na ",
        link("Heuréke", "https://obchody.heureka.sk/herbatica-sk/recenze/"),
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
        link("tu", "/napiste-nam/"),
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
} as const;
