import type { HerbatikaMarketCode } from "@/lib/storefront/market-context"

export type StorefrontAuthMessages = Readonly<{
  authenticationFailed: string
  authenticationRequired: string
  authenticationRequestFailed: (status: number) => string
  customerLoginTokenMissing: string
  emailAndPasswordRequired: string
  emailRequired: string
  invalidAuthenticationRequest: string
  invalidBillingAddressCountry: string
  invalidJson: string
  invalidJsonObject: string
  newPasswordRequired: string
  registrationFailed: string
  resetPasswordFailed: string
  resetPasswordLinkFailed: string
  resetPasswordTokenRequired: string
  sessionRestoreFailed: string
  unableToReachAuthenticationService: string
  wholesaleBillingAddressRequired: string
  wholesaleCompanyIdentifierRequired: string
  wholesaleCompanyNameRequired: string
  wholesaleConflict: string
  wholesaleDataInvalid: string
}>

const SK_AUTH_MESSAGES: StorefrontAuthMessages = {
  authenticationFailed: "Autentifikácia zlyhala.",
  authenticationRequired: "Vyžaduje sa prihlásenie.",
  authenticationRequestFailed: (status) =>
    `Autentifikačná požiadavka zlyhala so stavom ${status}.`,
  customerLoginTokenMissing:
    "Prihlásenie zákazníka prebehlo úspešne, ale token nebol vrátený.",
  emailAndPasswordRequired: "E-mail aj heslo sú povinné.",
  emailRequired: "E-mail je povinný.",
  invalidAuthenticationRequest: "Neplatné údaje autentifikačnej požiadavky.",
  invalidBillingAddressCountry: "Vyberte platnú krajinu fakturačnej adresy.",
  invalidJson: "Telo požiadavky musí byť platné JSON.",
  invalidJsonObject: "Telo požiadavky musí byť platný JSON objekt.",
  newPasswordRequired: "Nové heslo je povinné.",
  registrationFailed: "Nepodarilo sa dokončiť registráciu zákazníka.",
  resetPasswordFailed: "Nepodarilo sa obnoviť heslo.",
  resetPasswordLinkFailed: "Nepodarilo sa odoslať odkaz na obnovu hesla.",
  resetPasswordTokenRequired: "Token obnovy hesla je povinný.",
  sessionRestoreFailed: "Reláciu prihlásenia sa nepodarilo obnoviť.",
  unableToReachAuthenticationService:
    "Nepodarilo sa spojiť s autentifikačnou službou Medusa.",
  wholesaleBillingAddressRequired: "Fakturačná adresa je povinná.",
  wholesaleCompanyIdentifierRequired:
    "IČO alebo firemný identifikátor je povinný.",
  wholesaleCompanyNameRequired: "Názov firmy je povinný.",
  wholesaleConflict:
    "Účet s týmto e-mailom už existuje. Prihláste sa a požiadajte o VO účet cez podporu.",
  wholesaleDataInvalid: "Firemné údaje musia byť platný objekt.",
}

const CZ_AUTH_MESSAGES: StorefrontAuthMessages = {
  authenticationFailed: "E-mailová adresa nebo heslo nejsou správné.",
  authenticationRequired: "Je vyžadováno přihlášení.",
  authenticationRequestFailed: (status) =>
    `Požadavek na ověření selhal se stavem ${status}.`,
  customerLoginTokenMissing:
    "Přihlášení zákazníka proběhlo úspěšně, ale token nebyl vrácen.",
  emailAndPasswordRequired: "E-mail i heslo jsou povinné.",
  emailRequired: "E-mail je povinný.",
  invalidAuthenticationRequest: "Údaje požadavku na přihlášení nejsou platné.",
  invalidBillingAddressCountry: "Vyberte platnou zemi pro fakturační adresu.",
  invalidJson: "Tělo požadavku musí být platný JSON.",
  invalidJsonObject: "Tělo požadavku musí být platný objekt JSON.",
  newPasswordRequired: "Nové heslo je povinné.",
  registrationFailed: "Registraci zákazníka se nepodařilo dokončit.",
  resetPasswordFailed: "Heslo se nepodařilo obnovit.",
  resetPasswordLinkFailed: "Odkaz pro obnovení hesla se nepodařilo odeslat.",
  resetPasswordTokenRequired: "Token pro obnovení hesla je povinný.",
  sessionRestoreFailed: "Přihlašovací relaci se nepodařilo obnovit.",
  unableToReachAuthenticationService:
    "K autentizační službě Medusa se nepodařilo připojit.",
  wholesaleBillingAddressRequired: "Fakturační adresa je povinná.",
  wholesaleCompanyIdentifierRequired:
    "IČO nebo jiný identifikátor společnosti je povinný.",
  wholesaleCompanyNameRequired: "Název společnosti je povinný.",
  wholesaleConflict:
    "Účet s touto e-mailovou adresou již existuje. Přihlaste se a požádejte podporu o velkoobchodní účet.",
  wholesaleDataInvalid: "Firemní údaje musí být platný objekt.",
}

const HU_AUTH_MESSAGES: StorefrontAuthMessages = {
  authenticationFailed: "Az e-mail-cím vagy a jelszó helytelen.",
  authenticationRequired: "Bejelentkezés szükséges.",
  authenticationRequestFailed: (status) =>
    `A hitelesítési kérés ${status} állapotkóddal sikertelen volt.`,
  customerLoginTokenMissing:
    "Az ügyfél bejelentkezése sikeres volt, de a rendszer nem adott vissza tokent.",
  emailAndPasswordRequired: "Az e-mail-cím és a jelszó megadása kötelező.",
  emailRequired: "Az e-mail-cím megadása kötelező.",
  invalidAuthenticationRequest: "A hitelesítési kérés adatai érvénytelenek.",
  invalidBillingAddressCountry:
    "Válasszon érvényes országot a számlázási címhez.",
  invalidJson: "A kérés törzsének érvényes JSON-nak kell lennie.",
  invalidJsonObject: "A kérés törzsének érvényes JSON-objektumnak kell lennie.",
  newPasswordRequired: "Az új jelszó megadása kötelező.",
  registrationFailed: "Az ügyfél regisztrációja nem sikerült.",
  resetPasswordFailed: "A jelszó visszaállítása nem sikerült.",
  resetPasswordLinkFailed:
    "Nem sikerült elküldeni a jelszó-visszaállítási hivatkozást.",
  resetPasswordTokenRequired:
    "A jelszó-visszaállítási token megadása kötelező.",
  sessionRestoreFailed:
    "A bejelentkezési munkamenet visszaállítása nem sikerült.",
  unableToReachAuthenticationService:
    "Nem sikerült kapcsolódni a Medusa hitelesítési szolgáltatásához.",
  wholesaleBillingAddressRequired: "A számlázási cím megadása kötelező.",
  wholesaleCompanyIdentifierRequired:
    "Az adószám vagy a cégazonosító megadása kötelező.",
  wholesaleCompanyNameRequired: "A cégnév megadása kötelező.",
  wholesaleConflict:
    "Már létezik fiók ezzel az e-mail-címmel. Jelentkezzen be, és kérjen nagykereskedelmi fiókot az ügyfélszolgálattól.",
  wholesaleDataInvalid: "A cégadatoknak érvényes objektumnak kell lenniük.",
}

const RO_AUTH_MESSAGES: StorefrontAuthMessages = {
  authenticationFailed: "Adresa de e-mail sau parola este incorectă.",
  authenticationRequired: "Este necesară autentificarea.",
  authenticationRequestFailed: (status) =>
    `Cererea de autentificare a eșuat cu statusul ${status}.`,
  customerLoginTokenMissing:
    "Autentificarea clientului a reușit, dar tokenul nu a fost returnat.",
  emailAndPasswordRequired: "Adresa de e-mail și parola sunt obligatorii.",
  emailRequired: "Adresa de e-mail este obligatorie.",
  invalidAuthenticationRequest:
    "Datele cererii de autentificare nu sunt valide.",
  invalidBillingAddressCountry:
    "Selectați o țară validă pentru adresa de facturare.",
  invalidJson: "Corpul cererii trebuie să fie JSON valid.",
  invalidJsonObject: "Corpul cererii trebuie să fie un obiect JSON valid.",
  newPasswordRequired: "Parola nouă este obligatorie.",
  registrationFailed: "Înregistrarea nu a reușit. Încercați din nou.",
  resetPasswordFailed: "Parola nu a putut fi resetată.",
  resetPasswordLinkFailed:
    "Linkul pentru resetarea parolei nu a putut fi trimis.",
  resetPasswordTokenRequired: "Tokenul de resetare a parolei este obligatoriu.",
  sessionRestoreFailed: "Sesiunea de autentificare nu a putut fi restabilită.",
  unableToReachAuthenticationService:
    "Conectarea la serviciul de autentificare Medusa a eșuat.",
  wholesaleBillingAddressRequired: "Adresa de facturare este obligatorie.",
  wholesaleCompanyIdentifierRequired:
    "CUI-ul sau identificatorul companiei este obligatoriu.",
  wholesaleCompanyNameRequired: "Numele companiei este obligatoriu.",
  wholesaleConflict:
    "Există deja un cont cu această adresă de e-mail. Autentificați-vă sau folosiți recuperarea parolei.",
  wholesaleDataInvalid: "Datele companiei trebuie să fie un obiect valid.",
}

const AUTH_MESSAGES_BY_MARKET = {
  cz: CZ_AUTH_MESSAGES,
  hu: HU_AUTH_MESSAGES,
  ro: RO_AUTH_MESSAGES,
  sk: SK_AUTH_MESSAGES,
} as const satisfies Record<HerbatikaMarketCode, StorefrontAuthMessages>

export const resolveStorefrontAuthMessages = (
  market: HerbatikaMarketCode
): StorefrontAuthMessages => {
  if (!Object.hasOwn(AUTH_MESSAGES_BY_MARKET, market)) {
    throw new Error("Unsupported storefront auth market")
  }

  return AUTH_MESSAGES_BY_MARKET[market]
}
