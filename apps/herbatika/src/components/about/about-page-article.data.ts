import aboutStoreImage from "@/assets/about/1.avif"
import aboutTeamImage from "@/assets/about/2.avif"
import aboutProductsImage from "@/assets/about/3.avif"

import { aboutLink, type AboutArticleSection } from "./about-page.types"

export const aboutHero = {
  title: "O našom tíme",
  lead: [
    "Vitajte v ",
    aboutLink("Herbatica", "/znacka/herbatica/"),
    ", rodinnej firme, ktorá sa zrodila z túžby priniesť ľuďom prírodné riešenia pre zdravie, krásu a well-being. Sme tu pre vás od roku 2015, aby sme vám ponúkli jedinečné produkty, ktoré spájajú tradičné liečiteľské metódy s modernými poznatkami.",
  ],
}

export const aboutSections = [
  {
    title: "Začiatky značky Herbatica",
    paragraphs: [
      "Herbatica v jej začiatkoch nebola ničím viac než snom a víziou jej zakladateľov. Vznikla ako rodinný projekt Gajdošovcov. Vo svojich začiatkoch v r. 1991 sa firma venovala najmä obchodnej činnosti v kamennej predajni v Piešťanoch.",
      "Spoluzakladateľ Juraj, inšpirovaný svojím záujmom o alternatívnu medicínu a prírodnú kozmetiku, sa rozhodol vytvoriť miesto, kde by ľudia mohli nájsť účinné a menej známe produkty pre svoje zdravie. Nápad otvoriť e-shop skrsol v jeho hlave v dobe, keď sa intenzívne zaoberal otázkou, ako môže byť pre svoje okolie prínosný, čím mu vie prispieť a ako môže pomôcť. V prostredí bolo cítiť rodiaci sa priestor pre nové cesty k uzdraveniu, odlišné od tých tradičných.",
      [
        "Juraj mal vždy blízko k alternatívnej scéne v oblasti medicíny, ",
        aboutLink("kozmetiky", "/kozmetika-a-zdravie-2/"),
        ", liečiteľstva a v podstate všetkému, čo možno označiť, niekedy žiaľ aj hanlivo, za alternatívu.",
      ],
      "S podporou brata Michala a mamy Eleny sa v roku 2015 zrodil e-shop Herbatica.",
      "Hlavnou motiváciou jeho zrodu bola nutnosť zmeny. Zmeny v náhľade na svoje telo, dušu, myseľ a celkové zdravie. Ďalej zmeny v zmysle myšlienkového posunu od presvedčenia, že naše zdravie je pevne dané a nemenné, k uvedomeniu si, že sme jeho aktívnymi tvorcami a máme moc ovplyvniť, kedy a ako sa uzdravíme, a to bez ohľadu na to, ako je naše zdravie zapísané v zdravotnej karte.",
      [
        "Od svojho založenia sa Herbatica formuje ako unikátna zdravotná špeciálka. Zameraná je na produkty na prírodnej báze, ktoré sú ojedinelé, málo známe, ale zato veľmi účinné pri riešení konkrétnych zdravotných problémov - ",
        aboutLink("kožné problémy", "/kozne-problemy/"),
        " (",
        aboutLink("akné", "/akne/"),
        ", ",
        aboutLink("psoriáza", "/psoriaza-a-lupienka/"),
        ", ",
        aboutLink("ekzémy", "/ekzem/"),
        "), ",
        aboutLink("tráviace problémy", "/zaludok-a-pecen/"),
        ", problémy s ",
        aboutLink("kĺbmi", "/klby-a-pohybovy-aparat/"),
        ", ",
        aboutLink("bolesti chrbtice", "/bolest-chrbta-seknutie-v-krizoch/"),
        ", ",
        aboutLink("stres", "/stres-a-nervozita/"),
        ", ",
        aboutLink("cukrovka", "/cukrovka/"),
        ", ",
        aboutLink("kŕčové žily", "/krcove-zily/"),
        ", ",
        aboutLink("vysoký krvný tlak", "/vysoky-krvny-tlak/"),
        ", oslabená ",
        aboutLink("imunita", "/imunita/"),
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
        aboutLink(
          "výrobcov, konzultantov, výživových poradcov, fyzioterapeutov a ďalších odborníkov",
          "/odborne-poradenstvo-a-diagnostika/"
        ),
        ". Spolu títo odborníci tvoria silnú základňu, na ktorú sa vieme vždy spoľahnúť, či už v otázkach zloženia produktov, kombinácie jednotlivých ",
        aboutLink("účinných látok", "/aktivnelatky/"),
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
        aboutLink("pod značkou Herbatica", "/znacka/herbatica/"),
        ". Dnes ponúkame širokú škálu výrobkov - sypké zmesi, kapsuly, tobolky, kozmetické či ",
        aboutLink("jedlé oleje", "/specialne-jedle-oleje/"),
        " a krémy, gély, masti, prášky, ",
        aboutLink("bylinné čaje", "/caje/"),
        ", kávoviny, ",
        aboutLink("tinktúry", "/bylinne-extrakty/"),
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
        aboutLink("doplnkami stravy", "/doplnky-stravy/"),
        ", zdravými potravinami a ",
        aboutLink("medicínskou kozmetikou", "/kozmetika-a-zdravie-2/"),
        ". Našu ponuku plánujeme rozširovať o personalizované ",
        aboutLink("doplnky stravy", "/doplnky-vyzivy/"),
        ".",
      ],
      [
        "Budúcnosť vidíme najmä v osobnom kontakte. So snahou byť k vám ešte bližšie a ponúknuť vám viac, plánujeme otvoriť ďalšie predajne, kde vám radi poskytneme ",
        aboutLink(
          "odborné poradenstvo a diagnostiku",
          "/odborne-poradenstvo-a-diagnostika/"
        ),
        ". Tieto priestory chceme vybaviť modernými diagnostickými nástrojmi, ako je napríklad biorezonancia, ktoré umožňujú komplexné hodnotenie vášho zdravotného stavu.",
      ],
      [
        "Sme presvedčení, že skutočná krása pramení z vnútornej harmónie tela, duše a mysle. Preto sa budeme naďalej zameriavať na produkty podporujúce vaše celkové zdravie a ",
        aboutLink("vitalitu", "/energia-a-vitalita/"),
        ". Pre dosiahnutie týchto cieľov sa vždy radi spojíme s ďalšími odborníkmi z rôznych oblastí, vrátane biohacking komunity. Spoločne vám budeme prinášať najnovšie poznatky a účinné riešenia pre váš blahobyt.",
      ],
    ],
    image: {
      alt: "Produkty značky Herbatica",
      caption: "Zdroj foto: vlastný archív.",
      src: aboutProductsImage,
    },
  },
] satisfies readonly AboutArticleSection[]
