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

export const resolveStorefrontAuthMessages = (
  market: HerbatikaMarketCode
): StorefrontAuthMessages =>
  market === "ro" ? RO_AUTH_MESSAGES : SK_AUTH_MESSAGES
