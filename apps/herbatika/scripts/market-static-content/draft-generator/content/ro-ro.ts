import { legalTemplate, nonLegalPage } from "./builders"

export const RO_RO_DRAFT_PAGES = [
  nonLegalPage(
    "homepage",
    "Îngrijire naturală pentru fiecare zi",
    "Descoperă o selecție pentru stilul de viață echilibrat, îngrijirea personală și confortul de acasă.",
    "Alegere informată",
    [
      "Explorează categoriile și verifică înainte de cumpărare compoziția, utilizarea și avertismentele de pe pagina produsului și ambalaj.",
    ]
  ),
  nonLegalPage(
    "about",
    "Despre Herbatica",
    "Herbatica este un magazin online dedicat produselor pentru îngrijirea zilnică și un stil de viață echilibrat.",
    "Ce găsești la noi",
    [
      "Organizăm oferta în categorii clare și prezentăm informațiile disponibile despre caracteristici și utilizare.",
    ]
  ),
  nonLegalPage(
    "faq",
    "Întrebări frecvente",
    "Răspunsuri rapide despre alegerea produselor și parcursul comenzii.",
    "Cumpărături și asistență",
    [
      "Folosește filtrele și datele produsului. Urmărește comanda în mesajele primite și trimite întrebările prin canalul publicat pe site.",
    ]
  ),
  nonLegalPage(
    "contact-neutral",
    "Contact",
    "Ai nevoie de ajutor cu o comandă sau cu informațiile unui produs? Scrie prin canalul de contact publicat pe site.",
    "Contact sigur",
    [
      "Include numărul comenzii, dar nu trimite date sensibile de plată sau parole. Datele operatorului trebuie preluate doar din profilul aprobat.",
    ]
  ),
  nonLegalPage(
    "footer",
    "Subsolul magazinului",
    "Legături rapide către cumpărături, asistență și informațiile obligatorii.",
    "Navigare",
    [
      "Produse · Categorii · Contact · Întrebări frecvente · Livrare · Retur · Despre noi · Termeni · Confidențialitate · Cookie-uri",
    ]
  ),
  nonLegalPage(
    "affiliate",
    "Program de afiliere",
    "Ai o audiență pentru care oferta noastră poate fi relevantă? Trimite informațiile de bază despre proiect.",
    "Colaborare responsabilă",
    [
      "Descrie canalele, publicul și propunerea. Condițiile apar numai după confirmare individuală și nu pot fi folosite afirmații de sănătate neaprobate.",
    ]
  ),
  nonLegalPage(
    "wholesale",
    "Colaborare en-gros",
    "Pentru solicitările comerciale pregătim informații în funcție de sortimentul și volumul cerut.",
    "Solicitare",
    [
      "Menționează compania, piața, articolele, cantitatea și termenul. Disponibilitatea și prețul nu sunt confirmate până la acceptarea ofertei.",
    ]
  ),
  nonLegalPage(
    "dropshipping",
    "Dropshipping",
    "Analizăm individual colaborările de livrare în funcție de piață, sortiment și integrarea tehnică.",
    "Date necesare",
    [
      "Trimite țările, volumul și cerințele de integrare și suport. Această pagină nu constituie, singură, o ofertă de servicii.",
    ]
  ),
  nonLegalPage(
    "private-label",
    "Marcă proprie",
    "Evaluăm solicitările pentru produse sub marcă proprie în funcție de categorie, cantitate și cerințele pieței.",
    "Date necesare",
    [
      "Descrie categoria, piața, cantitatea, ambalajul și termenul. Realizarea necesită un acord separat și verificarea conformității.",
    ]
  ),
  nonLegalPage(
    "gift-voucher",
    "Voucher cadou",
    "Voucherul cadou îi permite destinatarului să aleagă din oferta curentă a magazinului.",
    "Utilizare",
    [
      "Înainte de cumpărare, verifică valoarea, valabilitatea, livrarea și regulile voucherului respectiv.",
    ]
  ),
  legalTemplate(
    "terms",
    "Termeni și condiții — model de completat",
    "Acesta nu este un aviz juridic și nu reprezintă termeni aprobați. Operatorul trebuie să completeze toate câmpurile și să obțină verificare juridică.",
    [
      "OPERATOR_LEGAL_NAME",
      "REGISTERED_ADDRESS",
      "COMPANY_ID",
      "VAT_ID",
      "CONTACT_EMAIL",
      "GOVERNING_LAW",
      "DISPUTE_RESOLUTION_BODY",
      "EFFECTIVE_DATE",
    ],
    "Completări obligatorii",
    [
      "Vânzător {{OPERATOR_LEGAL_NAME}}, sediu {{REGISTERED_ADDRESS}}, identificator {{COMPANY_ID}}, TVA {{VAT_ID}}, contact {{CONTACT_EMAIL}}. Completați contractul, prețurile, taxele, plata, livrarea, reclamațiile, retragerea, răspunderea, legea {{GOVERNING_LAW}}, litigiile {{DISPUTE_RESOLUTION_BODY}} și data {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "privacy",
    "Confidențialitate — model de completat",
    "Modelul nu poate fi publicat fără inventarierea completă a prelucrărilor și verificare juridică.",
    [
      "DATA_CONTROLLER_LEGAL_NAME",
      "DATA_CONTROLLER_ADDRESS",
      "COMPANY_ID",
      "PRIVACY_EMAIL",
      "DPO_CONTACT_OR_NOT_APPLICABLE",
      "PROCESSOR_REGISTER_URL",
      "RETENTION_SCHEDULE",
      "SUPERVISORY_AUTHORITY",
      "EFFECTIVE_DATE",
    ],
    "Completări obligatorii",
    [
      "Operator {{DATA_CONTROLLER_LEGAL_NAME}}, {{DATA_CONTROLLER_ADDRESS}}, identificator {{COMPANY_ID}}, contact {{PRIVACY_EMAIL}}, responsabil {{DPO_CONTACT_OR_NOT_APPLICABLE}}. Completați scopurile, temeiurile, datele, destinatarii, transferurile, durata {{RETENTION_SCHEDULE}}, împuterniciții {{PROCESSOR_REGISTER_URL}}, drepturile, autoritatea {{SUPERVISORY_AUTHORITY}} și data {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "cookies",
    "Cookie-uri — model de completat",
    "Modelul trebuie să reflecte tehnologiile instalate efectiv și nu poate presupune consimțământul.",
    [
      "CONSENT_PLATFORM",
      "COOKIE_INVENTORY_URL",
      "COOKIE_PROVIDERS",
      "COOKIE_DURATIONS",
      "CONSENT_WITHDRAWAL_PATH",
      "EFFECTIVE_DATE",
    ],
    "Completări obligatorii",
    [
      "Platformă {{CONSENT_PLATFORM}}, inventar {{COOKIE_INVENTORY_URL}}, furnizori {{COOKIE_PROVIDERS}}, durate {{COOKIE_DURATIONS}}, modificare {{CONSENT_WITHDRAWAL_PATH}}, data {{EFFECTIVE_DATE}}. Completați categoriile, scopurile și temeiurile.",
    ]
  ),
  legalTemplate(
    "returns",
    "Retur și retragere — model de completat",
    "Termenele, excepțiile și costurile trebuie confirmate de operator și de un specialist juridic.",
    [
      "RETURN_ADDRESS",
      "WITHDRAWAL_PERIOD_DAYS",
      "STATUTORY_EXCEPTIONS",
      "REFUND_DEADLINE_DAYS",
      "RETURN_COST_RULE",
      "COMPLAINT_AUTHORITY",
      "EFFECTIVE_DATE",
    ],
    "Completări obligatorii",
    [
      "Completați notificarea, adresa {{RETURN_ADDRESS}}, termenul {{WITHDRAWAL_PERIOD_DAYS}}, excepțiile {{STATUTORY_EXCEPTIONS}}, rambursarea {{REFUND_DEADLINE_DAYS}}, costul {{RETURN_COST_RULE}}, autoritatea {{COMPLAINT_AUTHORITY}} și data {{EFFECTIVE_DATE}}.",
    ]
  ),
  legalTemplate(
    "shipping",
    "Livrare — model de completat",
    "Curierii, prețurile și termenele trebuie preluate din oferta actuală și aprobată a operatorului.",
    [
      "SUPPORTED_COUNTRIES",
      "CARRIERS",
      "SHIPPING_PRICE_TABLE_URL",
      "DISPATCH_TIME",
      "DELIVERY_WINDOWS",
      "DAMAGE_CLAIM_PROCESS",
      "EFFECTIVE_DATE",
    ],
    "Completări obligatorii",
    [
      "Țări {{SUPPORTED_COUNTRIES}}, curieri {{CARRIERS}}, prețuri {{SHIPPING_PRICE_TABLE_URL}}, expediere {{DISPATCH_TIME}}, livrare {{DELIVERY_WINDOWS}}, deteriorare {{DAMAGE_CLAIM_PROCESS}}, data {{EFFECTIVE_DATE}}.",
    ]
  ),
] as const
