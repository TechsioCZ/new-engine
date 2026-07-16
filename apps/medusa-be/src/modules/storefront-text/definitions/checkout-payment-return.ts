import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_CHECKOUT_PAYMENT_RETURN_TEXT_DEFINITIONS = [
  {
    description: "Fallback při čekání na potvrzení platby.",
    key: "checkout.payment_return_confirmation_pending",
    namespace: "checkout",
    values: {
      cz: "Platbu se zatím nepodařilo potvrdit.",
      hu: "A fizetést egyelőre nem sikerült megerősíteni.",
      ro: "Plata nu a putut fi confirmată încă.",
      sk: "Platbu sa zatiaľ nepodarilo potvrdiť.",
    },
  },
  {
    description: "Fallback při chybě ověření platby.",
    key: "checkout.payment_return_verification_failed",
    namespace: "checkout",
    values: {
      cz: "Ověření platby selhalo.",
      hu: "A fizetés ellenőrzése sikertelen.",
      ro: "Verificarea plății a eșuat.",
      sk: "Overenie platby zlyhalo.",
    },
  },
  {
    description: "Akce pro návrat ze stavu platby na souhrn objednávky.",
    key: "checkout.payment_return_back_to_summary",
    namespace: "checkout",
    values: {
      cz: "Zpět na souhrn",
      hu: "Vissza az összegzéshez",
      ro: "Înapoi la sumar",
      sk: "Späť na súhrn",
    },
  },
  {
    description: "Akce pro změnu platby po návratu z platební brány.",
    key: "checkout.payment_return_change_payment",
    namespace: "checkout",
    values: {
      cz: "Změnit platbu",
      hu: "Fizetési mód módosítása",
      ro: "Schimbă metoda de plată",
      sk: "Zmeniť platbu",
    },
  },
  {
    description: "Nadpis stavu zrušené platby.",
    key: "checkout.payment_return_cancelled_title",
    namespace: "checkout",
    values: {
      cz: "Platba byla zrušena",
      hu: "A fizetést megszakították",
      ro: "Plata a fost anulată",
      sk: "Platba bola zrušená",
    },
  },
  {
    description: "Popis dalšího postupu po zrušení platby.",
    key: "checkout.payment_return_cancelled_description",
    namespace: "checkout",
    values: {
      cz: "Můžete se vrátit do souhrnu objednávky a zkusit platbu znovu.",
      hu: "Visszatérhet a rendelés összegzéséhez, és újra megpróbálhatja a fizetést.",
      ro: "Puteți reveni la sumarul comenzii și încerca plata din nou.",
      sk: "Môžete sa vrátiť do súhrnu objednávky a skúsiť platbu znova.",
    },
  },
  {
    description: "Nadpis chyby při chybějícím identifikátoru košíku platby.",
    key: "checkout.payment_return_missing_cart_title",
    namespace: "checkout",
    values: {
      cz: "Chybí košík platby",
      hu: "Hiányzik a fizetéshez tartozó kosár",
      ro: "Lipsește coșul asociat plății",
      sk: "Chýba košík platby",
    },
  },
  {
    description: "Popis chyby při chybějícím identifikátoru košíku platby.",
    key: "checkout.payment_return_missing_cart_description",
    namespace: "checkout",
    values: {
      cz: "Návrat z platební brány neobsahuje identifikátor košíku.",
      hu: "A fizetési átjáróból való visszatérés nem tartalmazza a kosár azonosítóját.",
      ro: "Răspunsul de la procesatorul de plăți nu conține identificatorul coșului.",
      sk: "Návrat z platobnej brány neobsahuje identifikátor košíka.",
    },
  },
  {
    description: "Akce pro opakování ověření platby.",
    key: "checkout.payment_return_retry",
    namespace: "checkout",
    values: {
      cz: "Zkusit znovu",
      hu: "Próbálja újra",
      ro: "Încearcă din nou",
      sk: "Skúsiť znova",
    },
  },
  {
    description: "Nadpis chyby při nepotvrzené platbě.",
    key: "checkout.payment_return_failed_title",
    namespace: "checkout",
    values: {
      cz: "Platbu se nepodařilo potvrdit",
      hu: "A fizetést nem sikerült megerősíteni",
      ro: "Plata nu a putut fi confirmată",
      sk: "Platbu sa nepodarilo potvrdiť",
    },
  },
  {
    description: "Nadpis průběžného ověřování platby.",
    key: "checkout.payment_return_verifying_title",
    namespace: "checkout",
    values: {
      cz: "Ověřujeme platbu",
      hu: "A fizetés ellenőrzése",
      ro: "Verificăm plata",
      sk: "Overujeme platbu",
    },
  },
  {
    description: "Popis průběžného ověřování platby.",
    key: "checkout.payment_return_verifying_description",
    namespace: "checkout",
    values: {
      cz: "Po návratu z platební brány dokončujeme objednávku. Obvykle to trvá jen několik sekund.",
      hu: "A fizetési átjáróból való visszatérés után befejezzük a rendelést. Ez általában csak néhány másodpercet vesz igénybe.",
      ro: "După revenirea de la procesatorul de plăți, finalizăm comanda. De obicei durează doar câteva secunde.",
      sk: "Po návrate z platobnej brány dokončujeme objednávku. Zvyčajne to trvá len pár sekúnd.",
    },
  },
  {
    description: "Nápověda pro déle trvající ověření platby.",
    key: "checkout.payment_return_help",
    namespace: "checkout",
    values: {
      cz: "Pokud se stav nezmění, můžete objednávku zkontrolovat v účtu nebo zkusit dokončení znovu.",
      hu: "Ha az állapot nem változik, ellenőrizheti a rendelést a fiókjában, vagy újra megpróbálhatja a befejezést.",
      ro: "Dacă starea nu se schimbă, puteți verifica comanda în cont sau puteți încerca din nou finalizarea.",
      sk: "Ak sa stav nezmení, objednávku môžete skontrolovať v účte alebo skúsiť dokončenie znova.",
    },
  },
  {
    description: "Srozumitelná chyba pro nedokončenou nebo zrušenou platbu.",
    key: "checkout.payment_return_not_completed",
    namespace: "checkout",
    values: {
      cz: "Platba nebyla dokončena nebo byla zrušena.",
      hu: "A fizetés nem fejeződött be, vagy megszakították.",
      ro: "Plata nu a fost finalizată sau a fost anulată.",
      sk: "Platba nebola dokončená alebo bola zrušená.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
