"use client"

import { toaster } from "@techsio/ui-kit/molecules/toast"

const DEFAULT_DURATIONS = {
  error: 4000,
  info: 2500,
  success: 3000,
  warning: 3500,
} as const

// Cart-specific toast messages
const cartToasts = {
  addSuccess: (productName: string, quantity = 1) => ({
    description: `${quantity}x ${productName}`,
    title: "Přidáno do košíku",
    type: "success" as const,
  }),

  removeSuccess: (productName: string) => ({
    description: productName,
    title: "Odebráno z košíku",
    type: "info" as const,
  }),

  updateSuccess: () => ({
    title: "Košík aktualizován",
    type: "success" as const,
  }),

  createError: () => ({
    description: "Zkuste to prosím znovu",
    title: "Chyba při vytváření košíku",
    type: "error" as const,
  }),

  addError: (error?: string) => ({
    description: error || "Zkuste to prosím znovu",
    title: "Nepodařilo se přidat do košíku",
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

  networkError: () => ({
    description: "Zkontrolujte internetové připojení",
    title: "Chyba připojení",
    type: "error" as const,
  }),

  mergeSuccess: (itemCount: number) => ({
    description: `${itemCount} položek přidáno do vašeho košíku`,
    title: "Košík sloučen",
    type: "success" as const,
  }),

  // Shipping-specific messages
  shippingError: () => ({
    description:
      "Nepodařilo se nastavit způsob dopravy. Zkuste to prosím znovu.",
    title: "Chyba při nastavení dopravy",
    type: "error" as const,
  }),

  // Shipping address messages
  shippingAddressSuccess: () => ({
    description: "Dodací adresa byla aktualizována",
    title: "Adresa uložena",
    type: "success" as const,
  }),

  shippingAddressError: () => ({
    description: "Nepodařilo se aktualizovat dodací adresu",
    title: "Chyba při ukládání adresy",
    type: "error" as const,
  }),

  shippingAddressValidation: (fields: string[]) => ({
    description: `Neplatné pole: ${fields.join(", ")}`,
    title: "Zkontrolujte adresu",
    type: "warning" as const,
  }),

  // Payment-specific messages
  paymentInitiatedSuccess: () => ({
    description: "Platební session byla úspěšně vytvořena",
    title: "Platba iniciována",
    type: "success" as const,
  }),

  paymentInitiatedError: () => ({
    description: "Nepodařilo se vytvořit platební session",
    title: "Chyba při inicializaci platby",
    type: "error" as const,
  }),

  paymentValidation: (issues: string[]) => ({
    description: issues.join(", "),
    title: "Nelze iniciovat platbu",
    type: "warning" as const,
  }),
}

// Auth-specific toast messages
const authToasts = {
  loginError: (error?: string) => ({
    title: "Přihlášení se nezdařilo",
    description: error || "Zkontrolujte e-mail a heslo",
    type: "error" as const,
  }),

  loginSuccess: () => ({
    title: "Přihlášení úspěšné",
    description: "Vítejte zpět!",
    type: "success" as const,
  }),

  logoutError: () => ({
    title: "Odhlášení se nezdařilo",
    description: "Zkuste to prosím znovu",
    type: "error" as const,
  }),

  logoutSuccess: () => ({
    title: "Odhlášení",
    description: "Byli jste odhlášeni",
    type: "info" as const,
  }),

  passwordChanged: () => ({
    title: "Heslo změněno",
    description: "Vaše heslo bylo úspěšně změněno",
    type: "success" as const,
  }),

  passwordResetError: () => ({
    title: "Nepodařilo se odeslat e-mail",
    description: "Zkontrolujte e-mailovou adresu",
    type: "error" as const,
  }),

  passwordResetSent: (email: string) => ({
    title: "E-mail odeslán",
    description: `Odkaz pro reset hesla byl odeslán na ${email}`,
    type: "success" as const,
  }),

  registerError: (error?: string) => ({
    title: "Registrace se nezdařila",
    description: error || "Zkuste to prosím znovu",
    type: "error" as const,
  }),

  registerSuccess: () => ({
    title: "Registrace úspěšná",
    description: "Váš účet byl vytvořen",
    type: "success" as const,
  }),

  sessionExpired: () => ({
    title: "Relace vypršela",
    description: "Přihlaste se prosím znovu",
    type: "warning" as const,
  }),
}

export function useAuthToast() {
  return {
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
  }
}

export function useCartToast() {
  return {
    // Cart-specific toast methods
    addedToCart: (productName: string, quantity = 1, options = {}) => {
      const message = cartToasts.addSuccess(productName, quantity)
      return toaster.create({
        ...message,
        duration: DEFAULT_DURATIONS.success,
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

    cartError: (error?: string, options = {}) => {
      const message = cartToasts.addError(error)
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
      options = {}
    ) => {
      const message = cartToasts.stockErrorWithDetails(available, requested)
      return toaster.create({
        ...message,
        duration: DEFAULT_DURATIONS.warning,
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

    shippingError: (options = {}) => {
      const message = cartToasts.shippingError()
      return toaster.create({
        ...message,
        duration: DEFAULT_DURATIONS.error,
        ...options,
      })
    },

    // Shipping address toast methods
    shippingAddressSuccess: (options = {}) => {
      const message = cartToasts.shippingAddressSuccess()
      return toaster.create({
        ...message,
        duration: DEFAULT_DURATIONS.success,
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

    shippingAddressValidation: (fields: string[], options = {}) => {
      const message = cartToasts.shippingAddressValidation(fields)
      return toaster.create({
        ...message,
        duration: DEFAULT_DURATIONS.warning,
        ...options,
      })
    },

    // Payment toast methods
    paymentInitiatedSuccess: (options = {}) => {
      const message = cartToasts.paymentInitiatedSuccess()
      return toaster.create({
        ...message,
        duration: DEFAULT_DURATIONS.success,
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

    paymentValidation: (issues: string[], options = {}) => {
      const message = cartToasts.paymentValidation(issues)
      return toaster.create({
        ...message,
        duration: DEFAULT_DURATIONS.warning,
        ...options,
      })
    },
  }
}
