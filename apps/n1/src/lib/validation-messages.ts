export const VALIDATION_MESSAGES = {
  // Field-specific messages
  address: {
    minLength: "Adresa musí mít alespoň 3 znaky",
    required: "Adresa je povinná",
  },
  city: {
    minLength: "Město musí mít alespoň 2 znaky",
    required: "Město je povinné",
  },
  country: {
    required: "Země je povinná",
  },
  email: {
    invalid: "Zadejte platnou e-mailovou adresu",
    required: "E-mail je povinný",
  },
  firstName: {
    minLength: "Jméno musí mít alespoň 2 znaky",
    required: "Jméno je povinné",
  },
  lastName: {
    minLength: "Příjmení musí mít alespoň 2 znaky",
    required: "Příjmení je povinné",
  },
  password: {
    confirmRequired: "Potvrzení hesla je povinné",
    invalid: "Heslo nesplňuje požadavky",
    match: "Hesla se shodují",
    mismatch: "Hesla se neshodují",
    required: "Heslo je povinné",
    tooShort: "Heslo musí mít alespoň 8 znaků",
  },
  phone: {
    invalid: "Telefon musí mít 9 číslic",
  },
  postalCode: {
    invalid: "PSČ musí být ve formátu 123 45",
    required: "PSČ je povinné",
  },
  terms: {
    required: "Musíte souhlasit s podmínkami",
  },
} as const
