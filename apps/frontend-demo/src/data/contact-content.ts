interface ContactInfo {
  type: "email" | "phone" | "address"
  label: string
  value: string
  link?: string
  icon: string // SVG path data
}

interface BusinessHours {
  day: string
  hours: string
}

export interface ContactContent {
  hero: {
    title: string
    subtitle: string
  }
  form: {
    title: string
    subjects: { value: string; label: string }[]
    labels: {
      firstName: string
      lastName: string
      email: string
      phone: string
      subject: string
      message: string
      submit: string
    }
    successMessage: {
      title: string
      description: string
    }
  }
  info: {
    title: string
    items: ContactInfo[]
  }
  hours: {
    title: string
    schedule: BusinessHours[]
    timezone: string
  }
  help: {
    title: string
    description: string
    linkText: string
    linkHref: string
  }
}

export const contactContent: ContactContent = {
  form: {
    labels: {
      email: "E-mailová adresa",
      firstName: "Jméno",
      lastName: "Příjmení",
      message: "Zpráva",
      phone: "Telefonní číslo",
      subject: "Předmět",
      submit: "Odeslat zprávu",
    },
    subjects: [
      { value: "general", label: "Obecný dotaz" },
      { value: "order", label: "Podpora objednávek" },
      { value: "shipping", label: "Otázka o doručení" },
      { value: "returns", label: "Vracení a výměny" },
      { value: "wholesale", label: "Velkoobchodní dotaz" },
      { value: "other", label: "Jiné" },
    ],
    successMessage: {
      description: "Ozvěme se vám co nejdříve.",
      title: "Zpráva odeslána!",
    },
    title: "Pošlete nám zprávu",
  },
  help: {
    description: "Hledáte rychlé odpovědi? Podívejte se na naše",
    linkHref: "/faq",
    linkText: "Často kladené otázky",
    title: "Rychlá pomoc",
  },
  hero: {
    subtitle:
      "Máte otázku nebo potřebujete pomoc? Jsme tu pro vás! Obraťte se na náš přátelský tým podpory a ozvěme se vám co nejdříve.",
    title: "Kontaktujte nás",
  },
  hours: {
    schedule: [
      { day: "Pondělí - Pátek", hours: "9:00 - 18:00" },
      { day: "Sobota", hours: "10:00 - 16:00" },
      { day: "Neděle", hours: "Zavřeno" },
    ],
    timezone: "Všechny časy jsou ve středoevropském čase (SEČ)",
    title: "Provozní doba",
  },
  info: {
    items: [
      {
        type: "email",
        label: "Napište nám na:",
        value: "pavel.koudelka@naucme.it",
        link: "mailto:pavel.koudelka@naucme.it",
        icon: "token-icon-email",
      },
      {
        type: "phone",
        label: "Zavolejte nám na:",
        value: "+420 731 472 822",
        link: "tel:+420731472822",
        icon: "token-icon-phone",
      },
    ],
    title: "Spojte se s námi",
  },
}
