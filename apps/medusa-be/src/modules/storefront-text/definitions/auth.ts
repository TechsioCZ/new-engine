import type { StorefrontTextDefinition } from "../registry"
import { STOREFRONT_AUTH_LOGIN_TEXT_DEFINITIONS } from "./auth-login"
import { STOREFRONT_AUTH_PASSWORD_TEXT_DEFINITIONS } from "./auth-password"
import { STOREFRONT_AUTH_REGISTER_TEXT_DEFINITIONS } from "./auth-register"

const STOREFRONT_AUTH_SHARED_TEXT_DEFINITIONS = [
  {
    description: "Přístupný název odkazu na zákaznický účet.",
    key: "auth.account_label",
    namespace: "auth",
    values: {
      cz: "Účet",
      hu: "Fiók",
      ro: "Cont",
      sk: "Účet",
    },
  },
  {
    description: "Sdílený label akce pro přihlášení zákazníka.",
    key: "auth.sign_in",
    namespace: "auth",
    values: {
      cz: "Přihlásit se",
      hu: "Bejelentkezés",
      ro: "Autentificare",
      sk: "Prihlásiť sa",
    },
  },
  {
    description: "Popisek pole pro heslo.",
    key: "auth.password",
    namespace: "auth",
    values: {
      cz: "Heslo",
      hu: "Jelszó",
      ro: "Parolă",
      sk: "Heslo",
    },
  },
  {
    description: "Popisek pole pro potvrzení hesla.",
    key: "auth.password_confirmation",
    namespace: "auth",
    values: {
      cz: "Potvrzení hesla",
      hu: "Jelszó megerősítése",
      ro: "Confirmarea parolei",
      sk: "Potvrdenie hesla",
    },
  },
  {
    description: "Popisek pole pro nové heslo.",
    key: "auth.new_password",
    namespace: "auth",
    values: {
      cz: "Nové heslo",
      hu: "Új jelszó",
      ro: "Parolă nouă",
      sk: "Nové heslo",
    },
  },
  {
    description: "Odkaz zpět na přihlašovací formulář.",
    key: "auth.back_to_login",
    namespace: "auth",
    values: {
      cz: "Zpět na přihlášení",
      hu: "Vissza a bejelentkezéshez",
      ro: "Înapoi la autentificare",
      sk: "Späť na prihlásenie",
    },
  },
  {
    description: "Akce pro přechod na přihlašovací formulář.",
    key: "auth.go_to_login",
    namespace: "auth",
    values: {
      cz: "Přejít na přihlášení",
      hu: "Tovább a bejelentkezéshez",
      ro: "Mergi la autentificare",
      sk: "Prejsť na prihlásenie",
    },
  },
  {
    description: "Upozornění na neúspěšný přenos košíku po přihlášení.",
    key: "auth.cart_transfer_failed",
    namespace: "auth",
    values: {
      cz: "Účet je aktivní, ale obsah košíku se nepodařilo přenést. Zkuste to prosím znovu v košíku.",
      hu: "A fiók aktív, de a kosár tartalmát nem sikerült átvinnie. Próbálja újra a kosárban.",
      ro: "Contul este activ, dar conținutul coșului nu a putut fi transferat. Încercați din nou în coș.",
      sk: "Účet je aktívny, ale obsah košíka sa nepodarilo preniesť. Skúste to prosím znova v košíku.",
    },
  },
  {
    description: "Nadpis seznamu požadavků na heslo.",
    key: "auth.password_requirements.title",
    namespace: "auth",
    values: {
      cz: "Požadavky na heslo:",
      hu: "Jelszókövetelmények:",
      ro: "Cerințe pentru parolă:",
      sk: "Požiadavky na heslo:",
    },
  },
  {
    description: "Požadavek na minimální délku hesla.",
    key: "auth.password_requirements.min_length",
    namespace: "auth",
    values: {
      cz: "Alespoň 8 znaků",
      hu: "Legalább 8 karakter",
      ro: "Cel puțin 8 caractere",
      sk: "Aspoň 8 znakov",
    },
  },
  {
    description: "Požadavek na číslici v hesle.",
    key: "auth.password_requirements.number",
    namespace: "auth",
    values: {
      cz: "Alespoň jedna číslice",
      hu: "Legalább egy számjegy",
      ro: "Cel puțin o cifră",
      sk: "Aspoň jedna číslica",
    },
  },
  {
    description: "Validační hláška pro chybějící typ účtu.",
    key: "auth.validation.account_type_required",
    namespace: "auth",
    values: {
      cz: "Vyberte typ účtu.",
      hu: "Válassza ki a fiók típusát.",
      ro: "Selectați tipul de cont.",
      sk: "Vyberte typ účtu.",
    },
  },
  {
    description: "Validační hláška pro chybějící heslo.",
    key: "auth.validation.password_required",
    namespace: "auth",
    values: {
      cz: "Zadejte heslo.",
      hu: "Adja meg a jelszót.",
      ro: "Introduceți parola.",
      sk: "Zadajte heslo.",
    },
  },
  {
    description: "Validační hláška pro příliš krátké heslo.",
    key: "auth.validation.password_min_length",
    namespace: "auth",
    values: {
      cz: "Heslo musí mít alespoň 8 znaků.",
      hu: "A jelszónak legalább 8 karakterből kell állnia.",
      ro: "Parola trebuie să conțină cel puțin 8 caractere.",
      sk: "Heslo musí mať aspoň 8 znakov.",
    },
  },
  {
    description: "Validační hláška pro heslo bez číslice.",
    key: "auth.validation.password_number",
    namespace: "auth",
    values: {
      cz: "Heslo musí obsahovat alespoň jednu číslici.",
      hu: "A jelszónak legalább egy számjegyet kell tartalmaznia.",
      ro: "Parola trebuie să conțină cel puțin o cifră.",
      sk: "Heslo musí obsahovať aspoň jednu číslicu.",
    },
  },
  {
    description: "Validační hláška pro chybějící potvrzení hesla.",
    key: "auth.validation.confirm_password_required",
    namespace: "auth",
    values: {
      cz: "Potvrďte heslo.",
      hu: "Erősítse meg a jelszót.",
      ro: "Confirmați parola.",
      sk: "Potvrďte heslo.",
    },
  },
  {
    description: "Validační hláška pro rozdílná hesla.",
    key: "auth.validation.password_mismatch",
    namespace: "auth",
    values: {
      cz: "Hesla se neshodují.",
      hu: "A jelszavak nem egyeznek.",
      ro: "Parolele nu coincid.",
      sk: "Heslá sa nezhodujú.",
    },
  },
  {
    description: "Validační hláška pro chybějící souhlas s podmínkami.",
    key: "auth.validation.terms_required",
    namespace: "auth",
    values: {
      cz: "Potřebujeme souhlas s obchodními podmínkami.",
      hu: "Az általános szerződési feltételek elfogadása kötelező.",
      ro: "Este necesar acordul cu termenii și condițiile.",
      sk: "Potrebujeme súhlas s obchodnými podmienkami.",
    },
  },
] as const satisfies readonly StorefrontTextDefinition[]

export const STOREFRONT_AUTH_TEXT_DEFINITIONS = [
  ...STOREFRONT_AUTH_SHARED_TEXT_DEFINITIONS,
  ...STOREFRONT_AUTH_LOGIN_TEXT_DEFINITIONS,
  ...STOREFRONT_AUTH_REGISTER_TEXT_DEFINITIONS,
  ...STOREFRONT_AUTH_PASSWORD_TEXT_DEFINITIONS,
] as const satisfies readonly StorefrontTextDefinition[]
