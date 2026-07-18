import type { StorefrontTextDefinition } from "../registry"

const defineCatalogProductText = <const Key extends string>(
  key: Key,
  description: string,
  values: StorefrontTextDefinition["values"]
) =>
  ({
    description,
    key,
    namespace: "catalog",
    values,
  }) satisfies StorefrontTextDefinition

export const STOREFRONT_CATALOG_PRODUCT_TEXT_DEFINITIONS = [
  defineCatalogProductText(
    "catalog.product_card.price_on_request",
    "Zástupný text ceny produktu, když katalog neposkytne cenu.",
    {
      cz: "Cena na vyžádání",
      hu: "Ár kérésre",
      ro: "Preț la cerere",
      sk: "Cena na vyžiadanie",
    }
  ),
  defineCatalogProductText(
    "catalog.product_card.collection_empty",
    "Prázdný stav kolekce bez dostupných produktů.",
    {
      cz: "V této sekci momentálně nejsou žádné produkty.",
      hu: "Ebben a szakaszban jelenleg nincsenek termékek.",
      ro: "Momentan nu există produse în această secțiune.",
      sk: "V tejto sekcii momentálne nie sú žiadne produkty.",
    }
  ),
  defineCatalogProductText(
    "catalog.product_card.recently_visited_title",
    "Nadpis sekce naposledy navštívených produktů.",
    {
      cz: "Naposledy navštívené",
      hu: "Legutóbb megtekintett",
      ro: "Vizitate recent",
      sk: "Naposledy navštívené",
    }
  ),
  defineCatalogProductText(
    "catalog.product_card.recently_visited_empty",
    "Prázdný stav sekce naposledy navštívených produktů.",
    {
      cz: "Zatím nemáte žádné naposledy navštívené produkty.",
      hu: "Még nincsenek legutóbb megtekintett termékeid.",
      ro: "Nu ai încă produse vizitate recent.",
      sk: "Zatiaľ nemáte žiadne naposledy navštívené produkty.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.homepage_title",
    "Nadpis zákaznických hodnocení na souhrnné ploše.",
    {
      cz: "Ověřeno zákazníky",
      hu: "Vásárlóink által hitelesítve",
      ro: "Confirmat de clienți",
      sk: "Overené zákazníkmi",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.product_title",
    "Nadpis hodnocení produktu.",
    {
      cz: "Hodnocení produktu",
      hu: "Termékértékelések",
      ro: "Evaluările produsului",
      sk: "Hodnotenie produktu",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.tab_label",
    "Label záložky hodnocení produktu.",
    { cz: "Hodnocení", hu: "Értékelések", ro: "Evaluări", sk: "Hodnotenie" }
  ),
  defineCatalogProductText(
    "catalog.reviews.all_reviews",
    "Odkaz na všechna hodnocení produktu.",
    {
      cz: "Všechna hodnocení",
      hu: "Összes értékelés",
      ro: "Toate evaluările",
      sk: "Všetky hodnotenia",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.verified_purchase",
    "Označení ověřeného nákupu u recenze.",
    {
      cz: "Ověřený nákup",
      hu: "Ellenőrzött vásárlás",
      ro: "Achiziție verificată",
      sk: "Overený nákup",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.verified_customer_badge_alt",
    "Alternativní text odznaku ověřeného zákazníka.",
    {
      cz: "Ověřeno zákazníky Heureka",
      hu: "Heureka által ellenőrzött vásárlók",
      ro: "Clienți verificați Heureka",
      sk: "Overené zákazníkmi Heureka",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.rating_aria",
    "Přístupný popis číselného hodnocení.",
    {
      cz: "Průměrné hodnocení produktu {rating} z {max}",
      hu: "A termék átlagos értékelése {rating} / {max}",
      ro: "Evaluarea medie a produsului este {rating} din {max}",
      sk: "Priemerné hodnotenie produktu {rating} z {max}",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.based_on_count",
    "Souhrn počtu hodnocení produktu.",
    {
      cz: "Na základě {count, plural, one {# hodnocení} few {# hodnocení} other {# hodnocení}}",
      hu: "{count, plural, other {# értékelés alapján}}",
      ro: "Pe baza a {count, plural, one {# evaluare} few {# evaluări} other {# de evaluări}}",
      sk: "Na základe {count, plural, one {# hodnotenia} few {# hodnotení} many {# hodnotenia} other {# hodnotení}}",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.loading_aria",
    "Přístupný popis načítání recenzí.",
    {
      cz: "Načítám recenze",
      hu: "Értékelések betöltése",
      ro: "Se încarcă recenziile",
      sk: "Načítavam recenzie",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.unavailable",
    "Stav nedostupných recenzí produktu.",
    {
      cz: "Recenze produktu momentálně nejsou dostupné.",
      hu: "A termékértékelések jelenleg nem érhetők el.",
      ro: "Recenziile produsului nu sunt disponibile momentan.",
      sk: "Recenzie produktu nie sú momentálne dostupné.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.load_failed",
    "Chyba při načítání recenzí produktu.",
    {
      cz: "Recenze se nepodařilo načíst.",
      hu: "Az értékeléseket nem sikerült betölteni.",
      ro: "Recenziile nu au putut fi încărcate.",
      sk: "Recenzie sa nepodarilo načítať.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.retry",
    "Akce pro opakování načtení recenzí.",
    {
      cz: "Zkusit znovu",
      hu: "Próbáld újra",
      ro: "Încearcă din nou",
      sk: "Skúsiť znova",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.empty_title",
    "Nadpis prázdného stavu recenzí produktu.",
    {
      cz: "Tento produkt zatím nemá recenze.",
      hu: "Ehhez a termékhez még nincs értékelés.",
      ro: "Acest produs nu are încă recenzii.",
      sk: "Tento produkt zatiaľ nemá recenzie.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.empty_description",
    "Doplňující text prázdného stavu recenzí produktu.",
    {
      cz: "První ověřená hodnocení se zobrazí přímo v této sekci.",
      hu: "Az első ellenőrzött értékelések ebben a szakaszban jelennek meg.",
      ro: "Primele evaluări verificate vor apărea direct în această secțiune.",
      sk: "Po prvých overených hodnoteniach sa zobrazia priamo v tejto sekcii.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.first_action",
    "Akce pro napsání první recenze produktu.",
    {
      cz: "Napsat první recenzi",
      hu: "Írd meg az első értékelést",
      ro: "Scrie prima recenzie",
      sk: "Napísať prvú recenziu",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.refreshing",
    "Stav aktualizace seznamu recenzí.",
    {
      cz: "Aktualizuji recenze",
      hu: "Értékelések frissítése",
      ro: "Se actualizează recenziile",
      sk: "Aktualizujem recenzie",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.anonymous",
    "Zástupné jméno anonymního autora recenze.",
    { cz: "Anonymní", hu: "Névtelen", ro: "Anonim", sk: "Anonymne" }
  ),
  defineCatalogProductText(
    "catalog.reviews.trust_badges_aria",
    "Sdílený přístupný název seznamu zdrojů hodnocení obchodu.",
    {
      cz: "Hodnocení obchodu",
      hu: "Az áruház értékelései",
      ro: "Evaluările magazinului",
      sk: "Hodnotenia obchodu",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.write_action",
    "Akce pro otevření formuláře nové recenze.",
    {
      cz: "Napsat recenzi",
      hu: "Értékelés írása",
      ro: "Scrie o recenzie",
      sk: "Napísať recenziu",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.auth_checking",
    "Stav ověřování přihlášení před napsáním recenze.",
    {
      cz: "Ověřuji přihlášení.",
      hu: "Bejelentkezés ellenőrzése.",
      ro: "Se verifică autentificarea.",
      sk: "Overujem prihlásenie.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.sign_in_required",
    "Výzva k přihlášení před napsáním recenze.",
    {
      cz: "Pro napsání recenze se prosím přihlaste.",
      hu: "Az értékelés írásához jelentkezz be.",
      ro: "Autentifică-te pentru a scrie o recenzie.",
      sk: "Na napísanie recenzie sa prosím prihláste.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.submit_success",
    "Potvrzení úspěšného odeslání recenze.",
    {
      cz: "Děkujeme za recenzi. Po schválení se zobrazí u produktu.",
      hu: "Köszönjük az értékelést. Jóváhagyás után megjelenik a terméknél.",
      ro: "Îți mulțumim pentru recenzie. După aprobare va apărea lângă produs.",
      sk: "Ďakujeme za recenziu. Po schválení sa zobrazí pri produkte.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.close",
    "Akce pro zavření dialogu recenze.",
    { cz: "Zavřít", hu: "Bezárás", ro: "Închide", sk: "Zavrieť" }
  ),
  defineCatalogProductText(
    "catalog.reviews.cancel",
    "Akce pro zrušení psaní recenze.",
    { cz: "Zrušit", hu: "Mégse", ro: "Anulează", sk: "Zrušiť" }
  ),
  defineCatalogProductText(
    "catalog.reviews.submit",
    "Akce pro odeslání recenze.",
    {
      cz: "Odeslat recenzi",
      hu: "Értékelés beküldése",
      ro: "Trimite recenzia",
      sk: "Odoslať recenziu",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.submitting",
    "Text akce během odesílání recenze.",
    {
      cz: "Odesílám recenzi...",
      hu: "Értékelés beküldése...",
      ro: "Se trimite recenzia...",
      sk: "Odosielam recenziu...",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.pending_description",
    "Informace o schválení recenze před zveřejněním.",
    {
      cz: "Recenze se zobrazí po schválení.",
      hu: "Az értékelés jóváhagyás után jelenik meg.",
      ro: "Recenzia va apărea după aprobare.",
      sk: "Recenzia sa zobrazí po schválení.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.dialog_title",
    "Nadpis formuláře nové recenze.",
    {
      cz: "Napsat recenzi",
      hu: "Értékelés írása",
      ro: "Scrie o recenzie",
      sk: "Napísať recenziu",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.form.rating_label",
    "Label hodnocení ve formuláři recenze.",
    { cz: "Hodnocení", hu: "Értékelés", ro: "Evaluare", sk: "Hodnotenie" }
  ),
  defineCatalogProductText(
    "catalog.reviews.form.rating_validation",
    "Validace povinného hodnocení ve formuláři recenze.",
    {
      cz: "Vyberte hodnocení od 1 do 5 hvězdiček.",
      hu: "Válassz 1 és 5 csillag közötti értékelést.",
      ro: "Selectează o evaluare de la 1 la 5 stele.",
      sk: "Vyberte hodnotenie od 1 do 5 hviezdičiek.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.form.content_min_length_validation",
    "Validace minimální délky textu recenze.",
    {
      cz: "Napište alespoň {min} znaky.",
      hu: "Írj legalább {min} karaktert.",
      ro: "Scrie cel puțin {min} caractere.",
      sk: "Napíšte aspoň {min} znakov.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.form.content_min_length_help",
    "Nápověda minimální délky textu recenze.",
    {
      cz: "Minimálně {min} znaky.",
      hu: "Legalább {min} karakter.",
      ro: "Minimum {min} caractere.",
      sk: "Minimálne {min} znakov.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.form.content_label",
    "Label textu recenze.",
    { cz: "Recenze", hu: "Értékelés", ro: "Recenzie", sk: "Recenzia" }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.generic",
    "Obecná bezpečná chyba odeslání recenze.",
    {
      cz: "Recenzi se nepodařilo odeslat. Zkuste to prosím znovu.",
      hu: "Az értékelést nem sikerült elküldeni. Próbáld újra.",
      ro: "Recenzia nu a putut fi trimisă. Încearcă din nou.",
      sk: "Recenziu sa nepodarilo odoslať. Skúste to prosím znova.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.purchase_required",
    "Chyba recenze vyžadující zakoupený produkt.",
    {
      cz: "Pro napsání recenze musíte mít tento produkt zakoupený.",
      hu: "Csak megvásárolt termékről írhatsz értékelést.",
      ro: "Pentru a scrie o recenzie trebuie să fi cumpărat acest produs.",
      sk: "Na napísanie recenzie musíte mať tento produkt zakúpený.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.validation",
    "Obecná validace obsahu recenze.",
    {
      cz: "Zkontrolujte hodnocení a text recenze.",
      hu: "Ellenőrizd az értékelést és a recenzió szövegét.",
      ro: "Verifică evaluarea și textul recenziei.",
      sk: "Skontrolujte prosím hodnotenie a text recenzie.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.rating_required",
    "Chyba chybějícího hodnocení z API recenzí.",
    {
      cz: "Vyberte hodnocení.",
      hu: "Válassz értékelést.",
      ro: "Selectează o evaluare.",
      sk: "Vyberte prosím hodnotenie.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.content_required",
    "Chyba chybějícího textu z API recenzí.",
    {
      cz: "Napište text recenze.",
      hu: "Írd meg az értékelés szövegét.",
      ro: "Scrie textul recenziei.",
      sk: "Napíšte prosím text recenzie.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.title_invalid",
    "Chyba neplatného nadpisu z API recenzí.",
    {
      cz: "Zkontrolujte nadpis recenze.",
      hu: "Ellenőrizd az értékelés címét.",
      ro: "Verifică titlul recenziei.",
      sk: "Skontrolujte prosím nadpis recenzie.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.token_used",
    "Chyba již použitého odkazu na recenzi.",
    {
      cz: "Tento odkaz na hodnocení už byl použit.",
      hu: "Ezt az értékelési linket már felhasználták.",
      ro: "Acest link de evaluare a fost deja folosit.",
      sk: "Tento odkaz na hodnotenie už bol použitý.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.token_expired",
    "Chyba expirovaného odkazu na recenzi.",
    {
      cz: "Platnost tohoto odkazu na hodnocení vypršela.",
      hu: "Ez az értékelési link lejárt.",
      ro: "Acest link de evaluare a expirat.",
      sk: "Tento odkaz na hodnotenie už expiroval.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.token_mismatch",
    "Chyba odkazu na recenzi pro jiný produkt.",
    {
      cz: "Tento odkaz nepatří k vybranému produktu.",
      hu: "Ez a link nem a kiválasztott termékhez tartozik.",
      ro: "Acest link nu corespunde produsului selectat.",
      sk: "Tento odkaz nepatrí k vybranému produktu.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.token_not_found",
    "Chyba neplatného odkazu na recenzi.",
    {
      cz: "Tento odkaz na hodnocení není platný.",
      hu: "Ez az értékelési link érvénytelen.",
      ro: "Acest link de evaluare nu este valid.",
      sk: "Tento odkaz na hodnotenie nie je platný.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.duplicate",
    "Chyba duplicitního hodnocení produktu.",
    {
      cz: "Tento produkt jste už hodnotili.",
      hu: "Ezt a terméket már értékelted.",
      ro: "Ai evaluat deja acest produs.",
      sk: "Tento produkt ste už hodnotili.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.auth_required",
    "Chyba odeslání recenze vyžadující přihlášení.",
    {
      cz: "Pro odeslání recenze se prosím přihlaste.",
      hu: "Az értékelés elküldéséhez jelentkezz be.",
      ro: "Autentifică-te pentru a trimite recenzia.",
      sk: "Pre odoslanie recenzie sa prosím prihláste.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.errors.forbidden",
    "Chyba zakázaného odeslání recenze produktu.",
    {
      cz: "Recenzi pro tento produkt momentálně nemůžete odeslat.",
      hu: "Ehhez a termékhez jelenleg nem küldhetsz értékelést.",
      ro: "Momentan nu poți trimite o recenzie pentru acest produs.",
      sk: "Recenziu pre tento produkt momentálne nemôžete odoslať.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.metadata_title",
    "Titulek stránky pro napsání recenze z odkazu.",
    {
      cz: "Napsat recenzi | Herbatica",
      hu: "Értékelés írása | Herbatica",
      ro: "Scrie o recenzie | Herbatica",
      sk: "Napísať recenziu | Herbatica",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.back_to_product",
    "Akce pro návrat z recenze na hodnocený produkt.",
    {
      cz: "Zpět na produkt",
      hu: "Vissza a termékhez",
      ro: "Înapoi la produs",
      sk: "Späť na produkt",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.back_to_store",
    "Akce pro návrat z recenze do obchodu.",
    {
      cz: "Zpět do obchodu",
      hu: "Vissza az áruházba",
      ro: "Înapoi în magazin",
      sk: "Späť do obchodu",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.missing_product",
    "Chyba odkazu na recenzi bez identifikátoru produktu.",
    {
      cz: "Odkaz na hodnocení neobsahuje produkt.",
      hu: "Az értékelési link nem tartalmaz terméket.",
      ro: "Linkul de evaluare nu conține un produs.",
      sk: "Odkaz na hodnotenie neobsahuje produkt.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.product_loading",
    "Stav načítání hodnoceného produktu.",
    {
      cz: "Načítám produkt.",
      hu: "Termék betöltése.",
      ro: "Se încarcă produsul.",
      sk: "Načítavam produkt.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.product_load_failed",
    "Varování při chybě načtení produktu na stránce recenze.",
    {
      cz: "Produkt se nepodařilo načíst. Recenzi můžete přesto odeslat.",
      hu: "A terméket nem sikerült betölteni. Az értékelést ettől még elküldheted.",
      ro: "Produsul nu a putut fi încărcat. Poți trimite totuși recenzia.",
      sk: "Produkt sa nepodarilo načítať. Recenziu môžete odoslať aj tak.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.product_not_found",
    "Varování pro nenalezený produkt na stránce recenze.",
    {
      cz: "Produkt se nepodařilo najít. Zkontrolujte odkaz z e-mailu.",
      hu: "A termék nem található. Ellenőrizd az e-mailben kapott linket.",
      ro: "Produsul nu a putut fi găsit. Verifică linkul din e-mail.",
      sk: "Produkt sa nepodarilo nájsť. Skontrolujte prosím odkaz z emailu.",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.eyebrow",
    "Doplňující nadpis stránky hodnocení nákupu.",
    {
      cz: "Hodnocení nákupu",
      hu: "Vásárlás értékelése",
      ro: "Evaluarea achiziției",
      sk: "Hodnotenie nákupu",
    }
  ),
  defineCatalogProductText(
    "catalog.reviews.token.product_label",
    "Label hodnoceného produktu na stránce recenze.",
    {
      cz: "Hodnocený produkt",
      hu: "Értékelt termék",
      ro: "Produs evaluat",
      sk: "Hodnotený produkt",
    }
  ),
] as const satisfies readonly StorefrontTextDefinition[]
