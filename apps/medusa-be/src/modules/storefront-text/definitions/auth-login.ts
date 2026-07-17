import type { StorefrontTextDefinition } from "../registry"

export const STOREFRONT_AUTH_LOGIN_TEXT_DEFINITIONS = [
  {
    description: "Krátký nadpis přihlášení v hlavičce.",
    key: "auth.login.short_title",
    namespace: "auth",
    values: {
      cz: "Přihlášení",
      hu: "Bejelentkezés",
      ro: "Autentificare",
      sk: "Prihlásenie",
    },
  },
  {
    description: "Nadpis přihlašovací stránky.",
    key: "auth.login.title",
    namespace: "auth",
    values: {
      cz: "Přihlášení do účtu",
      hu: "Bejelentkezés a fiókba",
      ro: "Autentificare în cont",
      sk: "Prihlásenie do účtu",
    },
  },
  {
    description: "Popis přihlašovacího formuláře.",
    key: "auth.login.description",
    namespace: "auth",
    values: {
      cz: "Zadejte přihlašovací údaje pro vstup do zákaznické sekce.",
      hu: "Adja meg bejelentkezési adatait az ügyfélfiók eléréséhez.",
      ro: "Introduceți datele de autentificare pentru a accesa secțiunea de client.",
      sk: "Zadajte prihlasovacie údaje pre vstup do zákazníckej sekcie.",
    },
  },
  {
    description: "Odkaz na obnovu zapomenutého hesla.",
    key: "auth.login.forgot_password",
    namespace: "auth",
    values: {
      cz: "Zapomenuté heslo?",
      hu: "Elfelejtette a jelszavát?",
      ro: "Ați uitat parola?",
      sk: "Zabudnuté heslo?",
    },
  },
  {
    description: "Text před odkazem na registraci.",
    key: "auth.login.no_account",
    namespace: "auth",
    values: {
      cz: "Nemáte ještě účet?",
      hu: "Még nincs fiókja?",
      ro: "Nu aveți încă un cont?",
      sk: "Nemáte ešte účet?",
    },
  },
  {
    description: "Odkaz na registraci zákazníka.",
    key: "auth.login.register_link",
    namespace: "auth",
    values: {
      cz: "Zaregistrujte se",
      hu: "Regisztráljon",
      ro: "Înregistrați-vă",
      sk: "Zaregistrujte sa",
    },
  },
  {
    description: "Potvrzení úspěšného přihlášení.",
    key: "auth.login.success",
    namespace: "auth",
    values: {
      cz: "Přihlášení proběhlo úspěšně.",
      hu: "A bejelentkezés sikeres volt.",
      ro: "Autentificarea a fost efectuată cu succes.",
      sk: "Prihlásenie prebehlo úspešne.",
    },
  },
  {
    description: "Chyba pro neplatné přihlašovací údaje.",
    key: "auth.login.invalid_credentials",
    namespace: "auth",
    values: {
      cz: "Nesprávný e-mail nebo heslo.",
      hu: "Helytelen e-mail-cím vagy jelszó.",
      ro: "Adresa de e-mail sau parola este incorectă.",
      sk: "Nesprávny e-mail alebo heslo.",
    },
  },
  {
    description: "Obecná chyba přihlášení.",
    key: "auth.login.failed",
    namespace: "auth",
    values: {
      cz: "Přihlášení se nezdařilo. Zkuste to prosím znovu.",
      hu: "A bejelentkezés nem sikerült. Próbálja újra.",
      ro: "Autentificarea nu a reușit. Încercați din nou.",
      sk: "Prihlásenie sa nepodarilo. Skúste to prosím znovu.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]
