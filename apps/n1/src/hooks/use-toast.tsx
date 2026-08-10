"use client"

import { toaster } from "@techsio/ui-kit/molecules/toast"

const DEFAULT_DURATIONS = {
  error: 4000,
  info: 2500,
  success: 3000,
  warning: 3500,
} as const

const TRY_AGAIN_DESCRIPTION = "Zkuste to prosím znovu"

// Cart-specific toast messages
const cartToasts = {
  addError: (error?: string) => ({
    description:
      error === "" ? TRY_AGAIN_DESCRIPTION : (error ?? TRY_AGAIN_DESCRIPTION),
    title: "Nepodařilo se přidat do košíku",
    type: "error" as const,
  }),
  addSuccess: (productName: string, quantity = 1) => ({
    description: `${quantity}x ${productName}`,
    title: "Přidáno do košíku",
    type: "success" as const,
  }),
  createError: () => ({
    description: TRY_AGAIN_DESCRIPTION,
    title: "Chyba při vytváření košíku",
    type: "error" as const,
  }),
  mergeSuccess: (itemCount: number) => ({
    description: `${itemCount} položek přidáno do vašeho košíku`,
    title: "Košík sloučen",
    type: "success" as const,
  }),
  networkError: () => ({
    description: "Zkontrolujte internetové připojení",
    title: "Chyba připojení",
    type: "error" as const,
  }),
  paymentInitiatedError: () => ({
    description: "Nepodařilo se vytvořit platební session",
    title: "Chyba při inicializaci platby",
    type: "error" as const,
  }),
  paymentInitiatedSuccess: () => ({
    description: "Platební session byla úspěšně vytvořena",
    title: "Platba iniciována",
    type: "success" as const,
  }),
  paymentValidation: (issues: string[]) => ({
    description: issues.join(", "),
    title: "Nelze iniciovat platbu",
    type: "warning" as const,
  }),
  removeSuccess: (productName: string) => ({
    description: productName,
    title: "Odebráno z košíku",
    type: "info" as const,
  }),
  shippingAddressError: () => ({
    description: "Nepodařilo se aktualizovat dodací adresu",
    title: "Chyba při ukládání adresy",
    type: "error" as const,
  }),
  shippingAddressSuccess: () => ({
    description: "Dodací adresa byla aktualizována",
    title: "Adresa uložena",
    type: "success" as const,
  }),
  shippingAddressValidation: (fields: string[]) => ({
    description: `Neplatné pole: ${fields.join(", ")}`,
    title: "Zkontrolujte adresu",
    type: "warning" as const,
  }),
  shippingError: () => ({
    description:
      "Nepodařilo se nastavit způsob dopravy. Zkuste to prosím znovu.",
    title: "Chyba při nastavení dopravy",
    type: "error" as const,
  }),
  stockError: () => ({
    description: "Produkt není dostupný v požadovaném množství",
    title: "Nedostatečné množství",
    type: "error" as const,
  }),
  stockErrorWithDetails: (available: number, requested: number) => ({
    description: `Na skladě je pouze ${available} ks, požadováno celkem ${requested} ks`,
    title: "Nedostatečné množství",
    type: "error" as const,
  }),
  updateSuccess: () => ({
    title: "Košík aktualizován",
    type: "success" as const,
  }),
}

// Auth-specific toast messages
const authToasts = {
  loginError: (error?: string) => ({
    description:
      error === ""
        ? "Zkontrolujte e-mail a heslo"
        : (error ?? "Zkontrolujte e-mail a heslo"),
    title: "Přihlášení se nezdařilo",
    type: "error" as const,
  }),

  loginSuccess: () => ({
    description: "Vítejte zpět!",
    title: "Přihlášení úspěšné",
    type: "success" as const,
  }),

  logoutError: () => ({
    description: TRY_AGAIN_DESCRIPTION,
    title: "Odhlášení se nezdařilo",
    type: "error" as const,
  }),

  logoutSuccess: () => ({
    description: "Byli jste odhlášeni",
    title: "Odhlášení",
    type: "info" as const,
  }),

  passwordChanged: () => ({
    description: "Vaše heslo bylo úspěšně změněno",
    title: "Heslo změněno",
    type: "success" as const,
  }),

  passwordResetError: () => ({
    description: "Zkontrolujte e-mailovou adresu",
    title: "Nepodařilo se odeslat e-mail",
    type: "error" as const,
  }),

  passwordResetSent: (email: string) => ({
    description: `Odkaz pro reset hesla byl odeslán na ${email}`,
    title: "E-mail odeslán",
    type: "success" as const,
  }),

  registerError: (error?: string) => ({
    description:
      error === "" ? TRY_AGAIN_DESCRIPTION : (error ?? TRY_AGAIN_DESCRIPTION),
    title: "Registrace se nezdařila",
    type: "error" as const,
  }),

  registerSuccess: () => ({
    description: "Váš účet byl vytvořen",
    title: "Registrace úspěšná",
    type: "success" as const,
  }),

  sessionExpired: () => ({
    description: "Přihlaste se prosím znovu",
    title: "Relace vypršela",
    type: "warning" as const,
  }),
}

export const useAuthToast = () => ({
  loginError: (error?: string, options = {}) => {
    const message = authToasts.loginError(error)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.error,
      ...options,
    })
  },

  loginSuccess: (options = {}) => {
    const message = authToasts.loginSuccess()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.success,
      ...options,
    })
  },

  logoutError: (options = {}) => {
    const message = authToasts.logoutError()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.error,
      ...options,
    })
  },

  logoutSuccess: (options = {}) => {
    const message = authToasts.logoutSuccess()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.info,
      ...options,
    })
  },

  passwordChanged: (options = {}) => {
    const message = authToasts.passwordChanged()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.success,
      ...options,
    })
  },

  passwordResetError: (options = {}) => {
    const message = authToasts.passwordResetError()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.error,
      ...options,
    })
  },

  passwordResetSent: (email: string, options = {}) => {
    const message = authToasts.passwordResetSent(email)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.success,
      ...options,
    })
  },

  registerError: (error?: string, options = {}) => {
    const message = authToasts.registerError(error)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.error,
      ...options,
    })
  },

  registerSuccess: (options = {}) => {
    const message = authToasts.registerSuccess()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.success,
      ...options,
    })
  },

  sessionExpired: (options = {}) => {
    const message = authToasts.sessionExpired()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.warning,
      ...options,
    })
  },
})

export const useCartToast = () => ({
  // Cart-specific toast methods
  addedToCart: (productName: string, quantity = 1, options = {}) => {
    const message = cartToasts.addSuccess(productName, quantity)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.success,
      ...options,
    })
  },
  cartError: (error?: string, options = {}) => {
    const message = cartToasts.addError(error)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.error,
      ...options,
    })
  },
  networkError: (options = {}) => {
    const message = cartToasts.networkError()
    return toaster.create({
      ...message,
      duration: Number.POSITIVE_INFINITY,
      ...options,
    })
  },
  paymentInitiatedError: (options = {}) => {
    const message = cartToasts.paymentInitiatedError()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.error,
      ...options,
    })
  },
  paymentInitiatedSuccess: (options = {}) => {
    const message = cartToasts.paymentInitiatedSuccess()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.success,
      ...options,
    })
  },
  paymentValidation: (issues: string[], options = {}) => {
    const message = cartToasts.paymentValidation(issues)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.warning,
      ...options,
    })
  },
  removedFromCart: (productName: string, options = {}) => {
    const message = cartToasts.removeSuccess(productName)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.info,
      ...options,
    })
  },
  shippingAddressError: (options = {}) => {
    const message = cartToasts.shippingAddressError()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.error,
      ...options,
    })
  },
  shippingAddressSuccess: (options = {}) => {
    const message = cartToasts.shippingAddressSuccess()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.success,
      ...options,
    })
  },
  shippingAddressValidation: (fields: string[], options = {}) => {
    const message = cartToasts.shippingAddressValidation(fields)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.warning,
      ...options,
    })
  },
  shippingError: (options = {}) => {
    const message = cartToasts.shippingError()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.error,
      ...options,
    })
  },
  stockWarning: (options = {}) => {
    const message = cartToasts.stockError()
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.warning,
      ...options,
    })
  },
  stockWarningWithDetails: (
    available: number,
    requested: number,
    options = {},
  ) => {
    const message = cartToasts.stockErrorWithDetails(available, requested)
    return toaster.create({
      ...message,
      duration: DEFAULT_DURATIONS.warning,
      ...options,
    })
  },
})
