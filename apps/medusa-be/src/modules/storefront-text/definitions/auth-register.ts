import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_AUTH_REGISTER_TEXT_DEFINITIONS = [
  {
    description: "Nadpis registrační stránky.",
    key: "auth.register.title",
    namespace: "auth",
    values: {
      cz: "Vytvoření účtu",
      hu: "Fiók létrehozása",
      ro: "Crearea contului",
      sk: "Vytvorenie účtu",
    },
  },
  {
    description: "Popis registračního formuláře.",
    key: "auth.register.description",
    namespace: "auth",
    values: {
      cz: "Vyplňte údaje a vytvořte si zákaznický účet.",
      hu: "Töltse ki az adatokat, és hozza létre ügyfélfiókját.",
      ro: "Completați datele și creați-vă un cont de client.",
      sk: "Vyplňte údaje a vytvorte si zákaznícky účet.",
    },
  },
  {
    description: "Akce pro odeslání registrace.",
    key: "auth.register.submit",
    namespace: "auth",
    values: {
      cz: "Registrovat se",
      hu: "Regisztráció",
      ro: "Înregistrare",
      sk: "Registrovať sa",
    },
  },
  {
    description: "Text před odkazem na přihlášení z registrace.",
    key: "auth.register.has_account",
    namespace: "auth",
    values: {
      cz: "Už máte účet?",
      hu: "Már van fiókja?",
      ro: "Aveți deja un cont?",
      sk: "Už máte účet?",
    },
  },
  {
    description: "Popisek volby typu registrovaného účtu.",
    key: "auth.register.account_type",
    namespace: "auth",
    values: {
      cz: "Typ účtu",
      hu: "Fiók típusa",
      ro: "Tipul contului",
      sk: "Typ účtu",
    },
  },
  {
    description: "Název běžného zákaznického účtu.",
    key: "auth.register.retail_label",
    namespace: "auth",
    values: {
      cz: "Běžný zákazník",
      hu: "Lakossági ügyfél",
      ro: "Client obișnuit",
      sk: "Bežný zákazník",
    },
  },
  {
    description: "Popis registrace běžného zákaznického účtu.",
    key: "auth.register.retail_description",
    namespace: "auth",
    values: {
      cz: "Registrace bez žádosti o velkoobchodní účet.",
      hu: "Regisztráció nagykereskedelmi fiók igénylése nélkül.",
      ro: "Înregistrare fără solicitarea unui cont angro.",
      sk: "Registrácia bez žiadosti o veľkoobchodný účet.",
    },
  },
  {
    description: "Název velkoobchodního zákaznického účtu.",
    key: "auth.register.wholesale_label",
    namespace: "auth",
    values: {
      cz: "Velkoobchodní zákazník",
      hu: "Nagykereskedelmi ügyfél",
      ro: "Client angro",
      sk: "VO zákazník",
    },
  },
  {
    description: "Popis registrace velkoobchodního zákaznického účtu.",
    key: "auth.register.wholesale_description",
    namespace: "auth",
    values: {
      cz: "Po registraci odešleme žádost ke schválení.",
      hu: "A regisztráció után jóváhagyásra elküldjük a kérelmet.",
      ro: "După înregistrare, vom trimite cererea spre aprobare.",
      sk: "Po registrácii odošleme žiadosť na schválenie.",
    },
  },
  {
    description: "Přístupný nadpis firemních údajů registrace.",
    key: "auth.register.company_fields",
    namespace: "auth",
    values: {
      cz: "Firemní údaje",
      hu: "Céges adatok",
      ro: "Datele companiei",
      sk: "Firemné údaje",
    },
  },
  {
    description: "Souhlas s obchodními podmínkami při registraci.",
    key: "auth.register.accept_terms",
    namespace: "auth",
    values: {
      cz: "Souhlasím s obchodními podmínkami",
      hu: "Elfogadom az általános szerződési feltételeket",
      ro: "Sunt de acord cu termenii și condițiile",
      sk: "Súhlasím s obchodnými podmienkami",
    },
  },
  {
    description: "Potvrzení úspěšné registrace.",
    key: "auth.register.success",
    namespace: "auth",
    values: {
      cz: "Registrace proběhla úspěšně.",
      hu: "A regisztráció sikeres volt.",
      ro: "Înregistrarea a fost efectuată cu succes.",
      sk: "Registrácia prebehla úspešne.",
    },
  },
  {
    description: "Potvrzení odeslání žádosti o velkoobchodní účet.",
    key: "auth.register.wholesale_success",
    namespace: "auth",
    values: {
      cz: "Žádost o velkoobchodní účet byla odeslána ke schválení. Do rozhodnutí můžete nakupovat jako běžný zákazník.",
      hu: "A nagykereskedelmi fiók iránti kérelmet jóváhagyásra elküldtük. A döntésig lakossági ügyfélként vásárolhat.",
      ro: "Cererea pentru contul angro a fost trimisă spre aprobare. Până la luarea deciziei, puteți cumpăra ca un client obișnuit.",
      sk: "Žiadosť o VO účet bola odoslaná na schválenie. Do rozhodnutia môžete nakupovať ako bežný zákazník.",
    },
  },
  {
    description: "Chyba registrace pro již používaný e-mail.",
    key: "auth.register.email_exists",
    namespace: "auth",
    values: {
      cz: "Účet s tímto e-mailem už existuje. Přihlaste se nebo použijte obnovu hesla.",
      hu: "Ezzel az e-mail-címmel már létezik fiók. Jelentkezzen be, vagy állítsa vissza a jelszavát.",
      ro: "Există deja un cont cu această adresă de e-mail. Autentificați-vă sau folosiți recuperarea parolei.",
      sk: "Účet s týmto e-mailom už existuje. Prihláste sa alebo použite obnovu hesla.",
    },
  },
  {
    description: "Obecná chyba registrace.",
    key: "auth.register.failed",
    namespace: "auth",
    values: {
      cz: "Registrace se nezdařila. Zkuste to prosím znovu.",
      hu: "A regisztráció nem sikerült. Próbálja újra.",
      ro: "Înregistrarea nu a reușit. Încercați din nou.",
      sk: "Registrácia sa nepodarila. Skúste to prosím znovu.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
