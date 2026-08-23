import { getPayload } from "payload"
import config from "../payload.config"
import type { Page } from "../payload-types"

/**
 * One-off migration: split the merged privacy-policy content on Payload
 * `pages` id=5 into two distinct documents for the `hu` and `cs` locales.
 *
 * Background (verified via inspect-privacy-page.ts against the live DB and
 * via curl+BeautifulSoup extraction of the official herbatica.hu/.cz pages):
 * every official Herbatica shop publishes TWO distinct legal documents:
 *   - Doc A: short "privacy declaration" (numbered points 1-18, references
 *     e-commerce statutes and the NAIH/national DPA).
 *   - Doc B: long 8-section GDPR "personal-data-processing conditions"
 *     (Roman numerals I-VIII, references GDPR Art. 4(7)).
 * `pages` id=5 sk/ro locales are already self-consistent Doc A end-to-end
 * and are never touched by this script.
 *
 * REVISION (owner decision, 2026-08-23): the original plan renamed id=5's
 * hu/cs slugs to the Doc B identity and created a brand-new page (id=21)
 * for Doc A. That is a dead end: the storefront's URL Registry resolves
 * information pages by a stable routeId -> entityId mapping, and a
 * `change-slug` command turns the OLD slug into a permanent alias of
 * id=5's route that can never be re-promoted to a different entity. So
 * id=5's existing registry routes (bound to the ORIGINAL hu/cs slugs,
 * i.e. the Doc A identity) could never be repointed to the new Doc A page
 * without a registry alias workaround.
 *
 * The zero-rename, zero-alias fix: keep both pages' identities (slug)
 * fixed and SWAP THE CONTENT instead.
 *   - id=5 keeps its original hu/cs slugs (Doc A identity: hu
 *     `adatvedelmi-nyilatkozat`, cs `prohlaseni-o-ochrane-osobnich-udaju`)
 *     and gets Doc A title+content.
 *   - id=21 (created by an earlier run of this script to temporarily hold
 *     Doc A under a new slug) is repurposed as the permanent home for Doc
 *     B: its slug becomes the Doc B identity (hu
 *     `a-szemelyes-adatok-vedelmenek-feltetelei`, cs
 *     `podminky-ochrany-osobnich-udaju`) and it gets Doc B title+content,
 *     which is captured VERBATIM off of id=5's current state (Doc B has
 *     never been re-typed anywhere in this script; it is moved, not
 *     reconstructed) before id=5 is overwritten with the static Doc A
 *     content below. Existing registry routes for both slugs are left
 *     completely alone - only two brand-new routes are needed for id=21,
 *     created separately via the URL Registry command endpoint.
 *
 * Because both target slugs are already claimed (by the "wrong" page) at
 * the start of a swap, the write happens in three steps to never violate
 * the per-locale unique slug constraint: (1) rename id=5 off its slug to a
 * throwaway temp value, freeing the Doc A slug; (2) move id=21 onto the
 * (now free) Doc B slug with Doc B content captured from id=5's original
 * state; this frees the Doc A slug id=21 held; (3) move id=5 onto the
 * (now free) Doc A slug with the static Doc A content.
 *
 * Lexical richText node shapes mirror the manual node-building convention
 * already established in localize-faq-ro.ts (heading/paragraph text
 * nodes; list items flattened into their own "- item" / "n. item"
 * paragraph). Two inline links in the source HTML (hu point 14's NAIH
 * link, cz's list item 13's Slovak-DPA link) are rendered as plain text
 * (including the visible URL) rather than as lexical link nodes.
 *
 * `title`, `slug`, `content` are the only localized fields on this
 * collection; `meta.title`/`meta.description`/`meta.image` (added by
 * @payloadcms/plugin-seo's seoPlugin) are also localized. `category`,
 * `status`, `visibility`, `publishedDate` are NOT localized and are never
 * touched by this script.
 *
 * Cache invalidation: `pages`' afterChange hook (createMedusaCacheHook)
 * enqueues a "cms-outbox" job per write; the cron that drains it is
 * disabled (see payload.config.ts jobs.autoRun[0].disableScheduling), so
 * after applying, drain it manually:
 *   pnpm exec payload run src/scripts/run-cms-outbox.ts
 *
 * Run (dry-run, default): payload run src/scripts/split-privacy-pages.ts
 * Run (apply):    PRIVACY_SPLIT_APPLY=1 payload run src/scripts/split-privacy-pages.ts
 */

const EXISTING_PAGE_ID = 5
const DOC_B_HOME_PAGE_ID = 21

type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }

// Doc B (GDPR "personal-data-processing conditions") identity that id=21's
// hu/cs slug + meta.title must carry once Doc B content is moved onto it.
const DOC_B_FIX: Record<"cs" | "hu", { slug: string; metaTitle: string }> = {
  cs: {
    metaTitle: "Podmínky ochrany osobních údajů",
    slug: "podminky-ochrany-osobnich-udaju",
  },
  hu: {
    metaTitle: "A személyes adatok védelmének feltételei",
    slug: "a-szemelyes-adatok-vedelmenek-feltetelei",
  },
}

// Doc A ("privacy declaration") content, scraped verbatim from the
// official hu/cs URLs (see script docblock). Lives permanently on id=5.
const DOC_A_HU_TITLE = "Adatvédelmi nyilatkozat"
const DOC_A_HU_SLUG = "adatvedelmi-nyilatkozat"
const DOC_A_CS_TITLE = "Prohlášení o ochraně osobních údajů"
const DOC_A_CS_SLUG = "prohlaseni-o-ochrane-osobnich-udaju"

const docAHuBlocks: DocBlock[] = [
  {
    type: "paragraph",
    text: '1. A Herbatica kft. által üzemeltetett www.herbatica.hu internetes áruház vásárlója (a továbbiakban: vásárló) személyes adatainak rögzítése, székhelye: Pöstyén, Komenského 20, irányítószám 921 01 , azonosítószám 50 176 374, adószám: 2120 198 454, IČ DPH: SK2120 198 454, bejegyezve a Nagyszombati Kerületi Bíróság Cégjegyzékébe, Section Sro, ügyszám: 37096 / T, összhangban van a törvény rendelkezéseivel törvény (a továbbiakban: Törvény) 18/2018. sz., valamint az Európai Parlament és a Tanács 2016/679. számú általános rendelete alapján a vásárló személyes adatainak feldolgozásával (a továbbiakban: Szt.) "GDPR").',
  },
  {
    type: "paragraph",
    text: "2. Az elektronikus kereskedelemre más speciális jogszabályok is vonatkoznak, mint például az elektronikus hírközlési törvény gyűjteményeiről szóló 351/2011 törvény az elektronikus kereskedelemről és a módosításokról szóló 22/2004. törvény gyűjteménye, 128/2002. törvény A fogyasztóvédelmi kérdésekben a belső piac állami ellenőrzéséről és egyes törvények módosításáról szóló törvény gyűjteménye.",
  },
  {
    type: "paragraph",
    text: "3. Az e-kereskedelmi üzemeltetőt jogszabály nem kötelezi felelős személy kijelölésére.",
  },
  {
    type: "paragraph",
    text: "4. Az adatkezelő személyes adatvédelmi kötelezettségei nem csak attól függnek, hogy ki az érintett (regisztrált ügyfél, potenciális ügyfél, leendő ügyfél), hanem attól, hogy az érintett személyes adatait (a továbbiakban: ügyfél) milyen célból kezelik. Az Üzemeltető mindig csak azokat a személyes adatokat kezelheti, amelyek az adott célhoz szükségesek, azaz a meghatározott cél teljesítéséhez valóban szükségesek.",
  },
  {
    type: "paragraph",
    text: "5. Az Üzemeltető beszerzi és feldolgozza ügyfelei azon személyes adatait, amelyekre szüksége van:",
  },
  {
    type: "paragraph",
    text: "a) megrendelés feldolgozása - név, vezetéknév, cím, tel. a megrendelő száma, e-mail címe, amely alapján az ügyfél beazonosítható vezeték- és vezetéknévvel, a cégvezető vagy egyéni vállalkozó vezeték- és vezetéknevével, azonosítószámával, áfaszámával, adószámával, a HU Cégjegyzékbe vagy a Cégjegyzékbe HU bejegyzett cég, IBAN számlaszám.",
  },
  {
    type: "paragraph",
    text: "b) reklamációkezelés - név, vezetéknév, cím, tel. a megrendelő száma, e-mail címe, amely alapján az ügyfél beazonosítható vezeték- és vezetéknévvel, a cégvezető vagy egyéni vállalkozó vezeték- és vezetéknevével, azonosítószámával, áfaszámával, adószámával, a HU Cégjegyzékbe vagy a Cégjegyzékbe HU bejegyzett cég, IBAN számlaszám.",
  },
  {
    type: "paragraph",
    text: "c) hírlevél terjesztés - név, vezetéknév, cím, tel. az ügyfél száma, e-mail címe, amely alapján az ügyfél névvel és vezetéknévvel azonosítható. Az e-mail címet csak akkor használja, ha az üzemeltetőnek már volt szerződéses jogviszonya egy adott ügyféllel, azaz az ügyfél korábban már vásárolt árut vagy szolgáltatást,",
  },
  {
    type: "paragraph",
    text: "d) törzsvásárlói program vezetése - név, vezetéknév, cím, tel. a megrendelő száma, e-mail címe, amely alapján az ügyfél beazonosítható vezeték- és vezetéknévvel, a cégvezető vagy egyéni vállalkozó vezeték- és keresztnevével, személyi igazolvánnyal, adószámmal, áfaszámmal, a HU Cégjegyzékbe bejegyzett cég vagy a Cégjegyzékbe bejegyzett cégnév HU",
  },
  {
    type: "paragraph",
    text: "e) e) értékelés publikációja - név, vezetéknév, cím, tel. az ügyfél száma, e-mail címe, amely alapján az ügyfél név- és vezetéknévvel azonosítható,",
  },
  {
    type: "paragraph",
    text: "f) az e-mail cím akkor személyes adat, ha olyan adathoz kapcsolódik, amely alapján a természetes személy azonosítható - a személy név- és vezetéknevével.",
  },
  {
    type: "paragraph",
    text: "g) az e-mail cím nem személyes adat, ha határozatlan idejű, nem kapcsolódik más olyan adathoz, amely egy adott természetes személy pontos azonosításához vezet.",
  },
  {
    type: "paragraph",
    text: "6. Az üzemeltető kizárólag az ügyfél e-mail címét kezeli, amely alapján az ügyfél névvel és vezetéknévvel azonosítható, az ilyen e-mail cím egyben az ügyfél személyes adata is.",
  },
  {
    type: "paragraph",
    text: "7. Jogosult az ügyfél személyes adatainak feldolgozására, azaz jogalapjára, amely:",
  },
  {
    type: "paragraph",
    text: "a) szerződés az ügyféllel,",
  },
  {
    type: "paragraph",
    text: "b) a vásárolt áruról adóbizonylatként számlát a 431/2002. sz. törvény - a számviteli törvény hatályos változatában - a jelen számviteli nyilvántartáshoz előírt valamennyi feltétellel,",
  },
  {
    type: "paragraph",
    text: "c) a törzsvásárlói program, személyes adatok kezelése az ügyfél hozzájárulásával.",
  },
  {
    type: "paragraph",
    text: "8. A személyes adatokat az Üzemeltető a vásárló hozzájárulásával kezeli, amelyet azok feldolgozása előtt, még a rendelés teljesítése előtt szerez meg, a <Megrendelés befejezése> gombra kattintva megerősíti, hogy hozzájárul személyes adatai kezeléséhez.",
  },
  {
    type: "paragraph",
    text: "9. Az ügyfél megszerzett személyes adatait csak az adott cél teljesítéséhez szükséges ideig őrzi meg. Az ügyfél személyes adatai a következő célból szerezhetők be:",
  },
  {
    type: "paragraph",
    text: "a) a végzés feldolgozása és a panasz esetleges kezelésének ezzel kapcsolatos célja a panasztételi időszakban, azaz 24 hónapon belül, illetve a joggyakorlás elévülési idejének, azaz 3 vagy 4 év alatt,",
  },
  {
    type: "paragraph",
    text: "b) a számviteli törvény 35. § (3) bekezdés b) pontjában foglaltak szerinti könyvelés a hatályos változatában a 431/2002. az évet követő években, az üzemeltető köteles gondoskodni arról, hogy a számviteli nyilvántartások védve legyenek az elvesztés, ellopás, megsemmisülés vagy műszaki eszközökkel, szoftverekkel, amelyek a visszaélés, sérülés, megsemmisülés, jogosulatlan hozzáférés, jogosulatlan hozzáférés, elvesztés vagy lopás ellen is védettek.",
  },
  {
    type: "paragraph",
    text: "10. Az adatkezelő által az a) pontban említett célból megszerzett személyes adatok nem használhatók fel a b), c) vagy d) pontban említett más célra. Ez azt jelenti, hogy a megrendelés feldolgozása céljából megszerzett személyes adatok nem kezelhetők automatikusan a törzsvásárlói program fenntartása érdekében anélkül, hogy az adatfelvételkor a vásárlót átláthatóan tájékoztatták volna, és az üzemeltetőnek nem lett volna erre jogalapja.",
  },
  {
    type: "paragraph",
    text: "11. Hozzájárulás, mint jogalap az 5. pont c) pontjában meghatározott célra, csak olyan személyeknek szükséges hírlevél küldéséhez, akik korábban nem állnak kapcsolatban a www.herbatica.hu weboldalon található webáruházzal.",
  },
  {
    type: "paragraph",
    text: "12. Ezt a hozzájárulást szabadon, egyértelműen, meghatározott célból, feltétel nélkül és egyéb információktól elkülönítve kell megadni.",
  },
  {
    type: "paragraph",
    text: "13. Hírlevelek (hirdetési információk, szórólapok kizárólag elektronikus úton e-mailben) küldésével az üzemeltető",
  },
  {
    type: "paragraph",
    text: "a) kapcsolatot épít ki és tart fenn az ügyfelekkel, tájékoztatja őket kedvezményekről, akciókról,",
  },
  {
    type: "paragraph",
    text: "b) rendelkezik adatbázissal azon meglévő vásárlókról, akik termékeit vásárolják az ezen személyek részére történő hírlevélküldéshez, hozzájárulásuk e-mailes szórólapküldéshez nem szükséges, c) jogos érdeke alapján jogosult rendszeres hírlevél küldésére az üzemeltető, aki egyben eladó, és érdeklődik a meglévő ügyfelekkel való együttműködés iránt, áruk vagy szolgáltatások reklámozása iránt egy korábbi vásárlás után.",
  },
  {
    type: "paragraph",
    text: "14. Az érintett/ügyfél személyes adataival és azok beszerzésének helyével kapcsolatos jogai a következők:",
  },
  {
    type: "paragraph",
    text: "- törvény 22. §-a szerinti személyes adatainak helyesbítéséhez vagy megváltoztatásához való jog,",
  },
  {
    type: "paragraph",
    text: "- törvény 23. §-a szerinti személyes adatai törlésének joga,",
  },
  {
    type: "paragraph",
    text: "- joga van felvenni a kapcsolatot a Nemzeti Adatvédelmi és Infomációsszabadság Hatósággal (a továbbiakban: „Hivatal”), ha kétség merül fel azzal kapcsolatban, hogy az adatkezelő nem tesz eleget személyes adatainak kezelésével és védelmével kapcsolatos kötelezettségeit. A Hivatal országos hatáskörű államigazgatási szerv, felügyeli a jogalkalmazást, ellenőrzi a személyes adatok kezelésének jogszerűségét, és a törvény 81. §-ában foglaltaknak megfelelően egyéb tevékenységet végez. A www.herbatica.hu weboldalon található online áruház minden vásárlója részletesebb információkat talál a https://www.naih.hu/",
  },
  {
    type: "paragraph",
    text: "15. Üzemeltető kötelezettségei a fogyasztói jogok jogszabály szerinti gyakorlása során:",
  },
  {
    type: "paragraph",
    text: "- a téves személyes adat helyesbítésére, vagy a hiányos személyes adatok kiegészítésére a törvény 22. §-a szerint indokolatlan késedelem nélkül max. 5 naptári napon belül,",
  },
  {
    type: "paragraph",
    text: "- törölje a vásárló személyes adatait, és a T. 25. §-a szerinti értesítési kötelezettségnek megfelelően a vásárló e-mail címére, ha kifejezetten kéri, haladéktalanul visszaigazoló e-mail üzenetet küld a személyes adatainak törléséről , max. naptári 5 napon belül.",
  },
  {
    type: "paragraph",
    text: "16. Az üzemeltető köteles törölni az ügyfél személyes adatait, ha",
  },
  {
    type: "paragraph",
    text: "- a személyes adatokra már nincs szükség abból a célból, amelyből azokat megszerezték vagy más módon kezelték,",
  },
  {
    type: "paragraph",
    text: "- a reklamáció határideje, valamint a 3 éves elévülési idő az áru megrendelése óta lejárt, és a vevő más árut nem rendelt,",
  },
  {
    type: "paragraph",
    text: "- az adatkezelés célja elmúlt, és az adatokra e célból már nincs szükség,",
  },
  {
    type: "paragraph",
    text: "- az ügyfél visszavonja személyes adatainak hírlevél küldés céljából történő kezeléséhez adott hozzájárulását,",
  },
  {
    type: "paragraph",
    text: "- törvény 27. §-a alapján az ügyfél tiltakozik személyes adatainak direkt marketing célú kezelése ellen, az üzemeltető köteles a tiltakozó ügyfél személyes adatait a továbbiakban nem kezelni, ideértve a profilalkotást, hogy azok milyen mértékben vonatkoznak direkt marketing.",
  },
  {
    type: "paragraph",
    text: "17. Az ügyfél személyes adatai nem törölhetők, ha még tart a reklamációs időszak.",
  },
  {
    type: "paragraph",
    text: "18. Az adatkezelő nem köteles a személyes adatokat törölni, ha azok kezelése különösen szükséges:",
  },
  {
    type: "paragraph",
    text: "- számviteli és adózási kötelezettségek teljesítésére,",
  },
  {
    type: "paragraph",
    text: "- közérdekű archiválás céljából (levéltári és anyakönyvi törvény szerinti archiválás)",
  },
  {
    type: "paragraph",
    text: "- statisztikai célokra, ill",
  },
  {
    type: "paragraph",
    text: "- jogi igények bizonyítására, érvényesítésére vagy védelmére, azaz",
  },
  {
    type: "paragraph",
    text: "- reklamációt tenni.",
  },
  {
    type: "paragraph",
    text: "Az üzemeltető az ügyfél személyes adatait jelen dokumentum 5. pontjában foglaltak szerint kezeli.",
  },
  {
    type: "paragraph",
    text: "Az Üzemeltető az általa kezelt személyes adatokat bizalmasan kezeli, a személyes adatok kezelésének a Törvény 79. §-a szerinti befejezése után is. A www.herbatica.hu oldalon található webáruház üzemeltetője kijelenti és egyben szavatolja, hogy a vásárló által megadott személyes adatok bizalmasak, és kizárólag a vásárlóval kötött szerződés teljesítéséhez használják fel, azokat nem adjuk át. bármely harmadik félnek.",
  },
  {
    type: "paragraph",
    text: "Jelen feltételek 2018.05.25-től érvényesek.",
  },
  {
    type: "paragraph",
    text: "Frissítve 2021.3.12-i hatállyal.",
  },
]

const docACsBlocks: DocBlock[] = [
  {
    type: "paragraph",
    text: "1. Zaznamenávání osobních údajů kupujícího internetového obchodu na webové stránce www.herbatica.cz (dále jako „zákazník“), jehož provozovatelem je společnost Herbatica, s. r. o., Turzovka-Stred 422, 023 54 Turzovka, Slovenská republika, , IČO 50 176 374, DIČ: 2120 198 454, IČ DPH: SK2120 198 454, zapsaná v obchodním rejstříku Okresního soudu v Trnavě, Oddíl Sro, vložka číslo 37096/T , je podle ustanovení zákona č. 18/2018 Sb. zákon o ochraně osobních údajů (dále jako „zákon“) a na základě obecného nařízení Evropského parlamentu a Rady č. 2016/679, zpracováním osobních údajů kupujícího (dále jako „GDPR“) .",
  },
  {
    type: "paragraph",
    text: "2. Na elektronický obchod se vztahují další osobitní právní předpisy, jako je zákon č. 351/2011 Sb. o elektronických komunikacích ve znění pozdějších předpisů a zákon č. 22/2004 Sb. o elektronickém obchodu a o změně, zákon č. 128/2002 Sb. o státní kontrole vnitřního trhu ve věcech ochrany spotřebitele a o změně některých zákonů.",
  },
  {
    type: "paragraph",
    text: "3. Provozovatel elektronického obchodu nemá ve smyslu zákona povinnost určit odpovědnou osobu. Povinnosti provozovatele při ochraně osobních údajů se neodvíjejí jen od toho, kdo je dotyčnou osobou (registrovaný zákazník, potenciální zákazník, příští zákazník) nýbrž od toho, k jakému účelu se osobní údaje dotčené osoby, kterým je zákazník internetového obchodu, zpracovávají. Provozovatel může zpracovávat vždy jen ty osobní údaje, které jsou pro daný účel nezbytné, tedy které skutečně pro naplnění určeného účelu potřebuje.",
  },
  {
    type: "paragraph",
    text: "4. Provozovatel získává a zpracovává nezbytné osobní údaje svých zákazníků, které potřebuje pro účely:",
  },
  {
    type: "paragraph",
    text: "a) vyřízení objednávky-jméno, příjmení, adresa, tel. číslo, e-mailová adresa zákazníka, na jejímž základě je možné zákazníka identifikovat se jménem a příjmením, jméno a příjmení jednatele obchodní společnosti nebo živnostníka, IČO, DIČ, DIČ, název obchodní společnosti, zapsané v obchodním rejstříku České republiky, nebo název společnosti zapsané v Živnostenském rejstříku České republiky, IBAN číslo účtu,",
  },
  {
    type: "paragraph",
    text: "b) vybavení reklamace-jméno, příjmení, adresa, tel. číslo, e-mailová adresa zákazníka, na jejímž základě je možné zákazníka identifikovat se jménem a příjmením, jméno a příjmení jednatele obchodní společnosti, nebo živnostníka, IČO, DIČ, DIČ pro účely DPH (plátců daně z přidané hodnoty), název obchodní společnosti, zapsané v obchodním rejstříku České republiky, nebo název společnosti zapsané v Živnostenském rejstříku České republiky, IBAN číslo účtu,",
  },
  {
    type: "paragraph",
    text: "c) rozesílání newsletteru-jméno, příjmení, adresa, tel. číslo, e-mailová adresa zákazníka, na jejímž základě je možné zákazníka identifikovat se jménem a příjmením. Provozovatel využívá e-mailovou adresu pouze v případě, že s konkrétním zákazníkem již byl v předchozím smluvním vztahu, tj. zákazník již zrealizoval předchozí koupi zboží nebo služby,",
  },
  {
    type: "paragraph",
    text: "d) vedení věrnostního programu-jméno, příjmení, adresa, tel. číslo, e-mailová adresa zákazníka, na jejímž základě je možné zákazníka identifikovat se jménem a příjmením, jméno a příjmení jednatele obchodní společnosti nebo živnostníka, IČO, DIČ, DIČ pro účely DPH, název obchodní společnosti, zapsané v obchodním rejstříku České republiky, nebo název společnosti zapsané v Živnostenském rejstříku České republiky",
  },
  {
    type: "paragraph",
    text: "e) zveřejnění reference-jméno, příjmení, adresa, tel. číslo, e-mailová adresa zákazníka, na jejímž základě je možné zákazníka identifikovat se jménem a příjmením,",
  },
  {
    type: "paragraph",
    text: "f) e-mailová adresa je osobním údajem tehdy, když je spojena s údajem, na jehož základě je možné fyzickou osobu identifikovat-se jménem a příjmením osoby,",
  },
  {
    type: "paragraph",
    text: "g) e-mailová adresa není osobním údajům, pokud je neurčitá, není spojena s jiným údajem, který vede k přesné identifikaci konkrétní fyzické osoby.",
  },
  {
    type: "paragraph",
    text: "5. Provozovatel zpracovává pouze e-mailovou adresu zákazníka, na jejímž základě je možné zákazníka identifikovat se jménem a příjmením, taková e-mailová adresa je také osobním údajům zákazníka.Osobní údaje (e-mailová adresa) získané na základě objednávky nebo vyplněného formuláře z webových stránek www.herbatica.cz může provozovatel poskytnout společnosti Google Ireland Limited nebo Meta Platforms Ireland Limited.",
  },
  {
    type: "paragraph",
    text: "6. Na zpracování osobních údajů zákazníka má oprávnění, tedy právní základ, kterým je:",
  },
  {
    type: "paragraph",
    text: "a) smlouva se zákazníkem,",
  },
  {
    type: "paragraph",
    text: "b) faktura jako daňový doklad na koupené zboží se všemi náležitostmi, které stanoví pro tento účetní záznam zákon č. 431/2002 Sb. Zákon o účetnictví v jeho účinné časové verzi,",
  },
  {
    type: "paragraph",
    text: "c) vedení věrnostního programu, s osobními údaji na základě souhlasu zákazníka.",
  },
  {
    type: "paragraph",
    text: "7. Osobní údaje zpracovává provozovatel na základě souhlasu zákazníka, který získá před jejich zpracováním, tj. dřív, než zákazník přejde k vyplňování objednávky, kliknutím na <Odeslat objednávku s povinností platby>, tím potvrdí, že souhlasí se zpracováním svých osobních údajů.",
  },
  {
    type: "paragraph",
    text: "8. Získané osobní údaje zákazníka uchovává pouze po dobu, jaká je nezbytná pro splnění daného účelu. Získané osobní údaje zákazníka na účel:",
  },
  {
    type: "paragraph",
    text: "a) vyřízení objednávky a s tím spojený účel případného vyřízení reklamace během reklamační lhůty, to je 24 měsíců, případně ještě během běhu promlčecí lhůty pro uplatnění práv, to je během 3 nebo 4 let,",
  },
  {
    type: "paragraph",
    text: "b) vedení účetnictví ve smyslu ust. § 35 odst.3 písm. b) z. č. 431/2002 Sb. Zákona o účetnictví v jeho účinné časové verzi, osobní údaje zákazníka, uvedené ve fakturách, jako účetních dokladech, uchovává po dobu 10 let, následujících po roce, kterého se týkají, přičemž provozovatel zajistil ochranu účetní dokumentace proti ztrátě, odcizení, zničení nebo poškození technickými prostředky, programovým vybavením, které jsou taktéž zabezpečeny před jejich zneužitím, poškozením, zničením, neoprávněnými zásahy do nich, neoprávněným přístupem k nim, ztrátou, nebo odcizením.",
  },
  {
    type: "paragraph",
    text: "9. Osobní údaje, které provozovatel získal na jeden účel, uvedený při písm. a), nepoužije na jiný účel, uvedený při písm. b), c) nebo d). To znamená, že získané osobní údaje pro účely vyřízení objednávky, nemůže automaticky zpracovávat pro účely vedení věrnostního programu, aniž byl o tom zákazník transparentně informován již v době získání údajů a aby měl na to provozovatel právní základ.",
  },
  {
    type: "paragraph",
    text: "10. Souhlas, jako právní základ pro účel uvedený v bodě 6. písm. c) se vyžaduje pro zasílání newsletteru jen u osob, které nemají předchozí vztah s internetovým obchodem na webové stránce www.herbatica.cz.",
  },
  {
    type: "paragraph",
    text: "11. Tento souhlas musí být dán svobodně, jednoznačně, na konkrétní účel, nepodmíněně a odděleně od jiných informací.",
  },
  {
    type: "paragraph",
    text: "12. Zasíláním newsletterů (reklamních informací, letáků výhradně elektronicky prostřednictvím e-mailu), provozovatel",
  },
  {
    type: "paragraph",
    text: "a) buduje a udržuje vztah se zákazníky, informuje je o slevách a akcích,",
  },
  {
    type: "paragraph",
    text: "b) má vytvořenou databázi stávajících zákazníků, kteří odebírají jeho produkty, pro zasílání newsletteru těmto osobám, jejich souhlas na zasílání reklamních letáků formou e-mailu není nutný, provozovatel je oprávněn pravidelně zasílat newsletter na základě oprávněného zájmu provozovatele, který je současně prodávajícím a má zájem pracovat se stávajícími zákazníky, propagovat zboží nebo služby po předchozím nákupu.",
  },
  {
    type: "paragraph",
    text: "13. Práva dotčené osoby/ zákazníka, které se týkají jeho osobních údajů a od něhož se získávají jsou:",
  },
  {
    type: "list",
    ordered: false,
    items: [
      "právo na opravu, nebo změnu jeho osobních údajů ve smyslu § 22 zákona,",
      "právo na výmaz jeho osobních údajů ve smyslu § 23 zákona,",
      "právo obrátit se na Úřad pro ochranu osobních údajů Slovenské republiky, se sídlem Hraničná 12, 820 07, Bratislava 27, Slovenská republika (dále jako „úřad“), v případě pochybnosti o tom, že provozovatel nedodržuje své povinnosti ohledně zpracování a ochrany jeho osobních údajů. Úřad je orgánem státní správy s celoslovenskou působností, monitoruje uplatňování zákona, prověřuje zákonnost zpracování osobních údajů, provádí další činnosti ve smyslu § 81 zákona. Každý kupující v internetovém obchodě umístěném na webové stránce www.herbatica.sz nalezne podrobnější informace na webové stránce https://dataprotection.gov.sk/uoou/sk/content/konanie-o-ochrane-osobnych-udajov.",
    ],
  },
  {
    type: "paragraph",
    text: "14. Povinnost provozovatele při uplatňování práv zákazníka ve smyslu zákona:",
  },
  {
    type: "paragraph",
    text: "a) převést opravu nesprávných osobních údajů, nebo doplnit neúplné osobní údaje ve smyslu § 22 zákona bez zbytečného odkladu, max. do 5 kalendářních dnů,",
  },
  {
    type: "paragraph",
    text: "b) vymazat osobní údaje kupujícího a ve smyslu oznamovacích povinností podle § 25 zákona na e-mailovou adresu kupujícího, v případě, že to výslovně požaduje, poslat potvrzující e-mail o vyškrtnutí jeho osobních údajů, a to bezodkladně, max. do 5 kalendářních dní.",
  },
  {
    type: "paragraph",
    text: "15. Vymazat osobní údaje zákazníka je provozovatel povinen v případě, že",
  },
  {
    type: "paragraph",
    text: "a) osobní údaje již nejsou potřebné pro účely, pro které se získávaly, nebo jinak zpracovávali,",
  },
  {
    type: "paragraph",
    text: "b) od objednávky zboží uplynula reklamační lhůta jak i 3 léta promlčecí lhůta a kupující si jiné zboží neobjednal,",
  },
  {
    type: "paragraph",
    text: "c) účel zpracování údajů již pominul a údaje pro tento účel již nejsou potřebné,",
  },
  {
    type: "paragraph",
    text: "d) zákazník odvolá souhlas se zpracováním jeho osobních údajů pro účely zasílání newsletteru,",
  },
  {
    type: "paragraph",
    text: "e) zákazník ve smyslu § 27 zákona zpochybňuje zpracovávání jeho osobních údajů pro účely přímého marketingu, provozovatel je v tomto případě povinen nezpracovávat dále osobní údaje namítajícího zákazníka, včetně profilování rozsahu, v jakém s přímým marketingem souvisí.",
  },
  {
    type: "paragraph",
    text: "16. Osobní údaje zákazníka nelze vymazat, pokud ještě plyne reklamační lhůta.",
  },
  {
    type: "paragraph",
    text: "17. Provozovatel není povinný osobní údaje vymazat, pokud jejich zpracování je třeba zejména:",
  },
  {
    type: "list",
    ordered: true,
    items: [
      "na plnění účetních a daňových povinností,",
      "pro účely archivace ve veřejném zájmu (archivace podle zákona o archivech a spisové),",
      "pro statistické účely, nebo",
      "na prokazování, uplatňování, nebo obhajování právních nároků, tj.",
      "na uplatnění reklamace.",
    ],
  },
  {
    type: "paragraph",
    text: "18. Provozovatel zpracovává osobní údaje zákazníka ve smyslu rozsahu bodu 5. tohoto dokumentu. Provozovatel zachovává mlčenlivost o osobních údajích, které zpracovává, a to i po ukončení zpracování osobních údajů ve smyslu § 79 zákona. Provozovatel internetového obchodu umístěném na webové stránce www.herbatica.cz tímto dokumentem vyhlašuje a současně garantuje, že poskytnuté osobní údaje zákazníka jsou důvěrné a budou použity pouze k uskutečnění plnění smlouvy se zákazníkem a nebudou poskytnuty žádným třetím stranám.",
  },
  {
    type: "paragraph",
    text: "Toto prohlášení o ochraně osobních údajů bylo aktualizováno a nabývá účinnost dne 10. 10. 2021.Datum poslední aktualizace: 19.5.2025.",
  },
]

const DOC_A: Record<
  "cs" | "hu",
  { title: string; slug: string; blocks: DocBlock[] }
> = {
  cs: { blocks: docACsBlocks, slug: DOC_A_CS_SLUG, title: DOC_A_CS_TITLE },
  hu: { blocks: docAHuBlocks, slug: DOC_A_HU_SLUG, title: DOC_A_HU_TITLE },
}

const textNode = (text: string) => ({
  detail: 0,
  format: 0,
  mode: "normal" as const,
  style: "",
  text,
  type: "text" as const,
  version: 1,
})

const paragraph = (children: unknown[]) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  textFormat: 0,
  textStyle: "",
  type: "paragraph" as const,
  version: 1,
})

type ContentNode = Page["content"]["root"]["children"][number]

const blockToNodes = (block: DocBlock): ContentNode[] => {
  if (block.type === "paragraph") {
    return [paragraph([textNode(block.text)])]
  }
  return block.items.map((item, index) =>
    paragraph([textNode(block.ordered ? `${index + 1}. ${item}` : `– ${item}`)])
  )
}

const buildDocContent = (blocks: DocBlock[]): Page["content"] => ({
  root: {
    children: blocks.flatMap(blockToNodes),
    direction: null,
    format: "",
    indent: 0,
    type: "root" as const,
    version: 1,
  },
})

type MetaGroup = NonNullable<Page["meta"]>

type LocalizedPageSnapshot = Readonly<{
  title: string
  slug: string
  meta: MetaGroup
  content: Page["content"]
}>

type RunCtx = {
  apply: boolean
  payload: Awaited<ReturnType<typeof getPayload>>
  plan: string[]
}

const readSnapshot = async (
  ctx: RunCtx,
  id: number,
  locale: "cs" | "hu"
): Promise<LocalizedPageSnapshot> => {
  const doc = await ctx.payload.findByID({
    collection: "pages",
    depth: 0,
    fallbackLocale: false,
    id,
    locale,
    overrideAccess: true,
  })
  return {
    content: doc.content,
    meta: (doc.meta ?? {}) as MetaGroup,
    slug: String(doc.slug ?? ""),
    title: String(doc.title ?? ""),
  }
}

const writeSnapshot = async (
  ctx: RunCtx,
  id: number,
  locale: "cs" | "hu",
  snapshot: LocalizedPageSnapshot
) => {
  if (!ctx.apply) {
    return
  }
  await ctx.payload.update({
    collection: "pages",
    data: {
      content: snapshot.content,
      meta: snapshot.meta,
      slug: snapshot.slug,
      title: snapshot.title,
    } as never,
    id,
    locale,
    overrideAccess: true,
  })
}

// Swap Doc A / Doc B content between id=5 and id=21 for one locale, with
// the three-step temp-slug dance needed because both target slugs are
// already claimed (by the "wrong" page) at the start of a swap. Idempotent:
// if id=5 already carries the Doc A slug and id=21 already carries the Doc
// B slug, this is a no-op.
const swapLocale = async (ctx: RunCtx, locale: "cs" | "hu") => {
  const docA = DOC_A[locale]
  const docBSlug = DOC_B_FIX[locale].slug

  const five = await readSnapshot(ctx, EXISTING_PAGE_ID, locale)
  const twentyOne = await readSnapshot(ctx, DOC_B_HOME_PAGE_ID, locale)

  const alreadyDone = five.slug === docA.slug && twentyOne.slug === docBSlug
  if (alreadyDone) {
    ctx.plan.push(
      `locale=${locale}: already swapped (id=${EXISTING_PAGE_ID} slug="${five.slug}" = Doc A, id=${DOC_B_HOME_PAGE_ID} slug="${twentyOne.slug}" = Doc B) - skipping`
    )
    return
  }

  const preSwapAsExpected =
    five.slug === docBSlug && twentyOne.slug === docA.slug
  if (!preSwapAsExpected) {
    throw new Error(
      `locale=${locale}: unexpected state, refusing to guess. id=${EXISTING_PAGE_ID} slug="${five.slug}" (expected "${docA.slug}" or "${docBSlug}"), id=${DOC_B_HOME_PAGE_ID} slug="${twentyOne.slug}" (expected "${docA.slug}" or "${docBSlug}"). Inspect manually before re-running.`
    )
  }

  ctx.plan.push(
    `locale=${locale}: swap - id=${EXISTING_PAGE_ID} "${five.title}" (${five.slug}) <-> id=${DOC_B_HOME_PAGE_ID} "${twentyOne.title}" (${twentyOne.slug}); id=${EXISTING_PAGE_ID} ends as Doc A ("${docA.title}", ${docA.slug}), id=${DOC_B_HOME_PAGE_ID} ends as Doc B ("${five.title}", ${docBSlug})`
  )

  if (!ctx.apply) {
    return
  }

  // Step 1: free id=5's current (Doc B) slug via a throwaway temp value.
  const tempSlug = `${five.slug}--swap-tmp-${Date.now()}`
  await ctx.payload.update({
    collection: "pages",
    data: { slug: tempSlug } as never,
    id: EXISTING_PAGE_ID,
    locale,
    overrideAccess: true,
  })

  // Step 2: move id=21 onto the now-free Doc B slug, carrying id=5's
  // original (captured) title/meta/content verbatim. This frees the Doc A
  // slug that id=21 was holding.
  await writeSnapshot(ctx, DOC_B_HOME_PAGE_ID, locale, {
    content: five.content,
    meta: { ...five.meta, title: DOC_B_FIX[locale].metaTitle },
    slug: docBSlug,
    title: five.title,
  })

  // Step 3: move id=5 onto the now-free Doc A slug with the static,
  // scrape-verified Doc A content.
  await writeSnapshot(ctx, EXISTING_PAGE_ID, locale, {
    content: buildDocContent(docA.blocks),
    meta: { ...twentyOne.meta, title: docA.title },
    slug: docA.slug,
    title: docA.title,
  })
}

const run = async () => {
  const ctx: RunCtx = {
    apply: process.env.PRIVACY_SPLIT_APPLY === "1",
    payload: await getPayload({ config }),
    plan: [],
  }

  try {
    await swapLocale(ctx, "hu")
    await swapLocale(ctx, "cs")

    ctx.payload.logger.info(
      `${ctx.apply ? "APPLY" : "DRY RUN (set PRIVACY_SPLIT_APPLY=1 to apply)"}:\n  ${ctx.plan.join("\n  ")}`
    )
  } finally {
    await ctx.payload.destroy()
  }
}

await run()
