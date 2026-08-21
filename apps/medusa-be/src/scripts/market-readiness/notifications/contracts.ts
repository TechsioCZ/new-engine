import type {
  ResendEmailLocale,
  ResendEmailTemplate,
} from "../../../modules/resend/contracts"
import { resendEmailTemplates } from "../../../modules/resend/contracts"

export const NOTIFICATION_READINESS_MARKETS = ["sk", "cz", "hu", "ro"] as const
export type NotificationReadinessMarket =
  (typeof NOTIFICATION_READINESS_MARKETS)[number]

export const FOUR_MARKET_NOTIFICATION_BINDINGS = {
  cz: { locale: "cs-CZ", senderDomain: "herbatica.cz" },
  hu: { locale: "hu-HU", senderDomain: "herbatica.hu" },
  ro: { locale: "ro-RO", senderDomain: "herbatica.ro" },
  sk: { locale: "sk-SK", senderDomain: "herbatica.sk" },
} as const satisfies Record<
  NotificationReadinessMarket,
  Readonly<{ locale: ResendEmailLocale; senderDomain: string }>
>

export const NOTIFICATION_CRITICAL_TEMPLATES = [
  resendEmailTemplates.ACCOUNT_SETUP,
  resendEmailTemplates.COMPANY_APPLICATION_APPROVED,
  resendEmailTemplates.COMPANY_APPLICATION_REJECTED,
  resendEmailTemplates.CLAIM_ACCESS_CODE,
  resendEmailTemplates.CLAIM_CONFIRMATION,
  resendEmailTemplates.CUSTOMER_ACCOUNT_DEACTIVATION,
  resendEmailTemplates.CUSTOMER_REGISTRATION_CONFIRMATION,
  resendEmailTemplates.FORGOT_PASSWORD,
  resendEmailTemplates.ORDER_PLACED,
  resendEmailTemplates.ORDER_PAYMENT_REMINDER,
  resendEmailTemplates.PRODUCT_REVIEW_REQUEST,
] as const satisfies readonly ResendEmailTemplate[]

export type NotificationCriticalTemplate =
  (typeof NOTIFICATION_CRITICAL_TEMPLATES)[number]

export type NotificationMarketConfiguration = Readonly<{
  from: string
  locale: ResendEmailLocale
  replyTo: string
  senderDomain: string
  templateMappings: Readonly<Record<NotificationCriticalTemplate, string>>
}>

export type NotificationTemplateRenderRequest = Readonly<{
  locale: ResendEmailLocale
  market: NotificationReadinessMarket
  template: NotificationCriticalTemplate
  templateId: string
  variables: Readonly<Record<string, unknown>>
}>

export type NotificationTemplateRenderResult = Readonly<{
  html: string
  subject: string
  text: string
}>

export type NotificationTemplateRenderer = Readonly<{
  render: (
    request: NotificationTemplateRenderRequest
  ) => Promise<NotificationTemplateRenderResult>
}>

export type NotificationTemplateInspector = Readonly<{
  inspect: (request: {
    template: NotificationCriticalTemplate
    templateId: string
  }) => Promise<Readonly<{ published: boolean }>>
}>

export type NotificationReadinessIssue = Readonly<{
  code:
    | "LOCALIZED_SUBJECT_MISSING"
    | "MARKET_CONFIGURATION_MISSING"
    | "RENDER_FAILED"
    | "RENDERED_SUBJECT_MISMATCH"
    | "REMOTE_INSPECTION_FAILED"
    | "SENDER_TUPLE_MISMATCH"
    | "TEMPLATE_MAPPING_MISMATCH"
  market: NotificationReadinessMarket
  template?: NotificationCriticalTemplate
}>

export type NotificationTemplateReadiness = Readonly<{
  configuredTemplateMatched: boolean
  htmlStructureSha256: string | null
  inspection: "failed" | "notRequested" | "passed"
  locale: ResendEmailLocale
  ready: boolean
  rendered: boolean
  subjectSha256: string | null
  textStructureSha256: string | null
}>

export type NotificationMarketReadiness = Readonly<{
  locale: ResendEmailLocale
  market: NotificationReadinessMarket
  ready: boolean
  senderDomain: string
  senderTupleMatched: boolean
  templates: Readonly<
    Record<NotificationCriticalTemplate, NotificationTemplateReadiness>
  >
}>

export type FourMarketNotificationReadinessArtifact = Readonly<{
  issues: readonly NotificationReadinessIssue[]
  marketResults: Readonly<
    Record<NotificationReadinessMarket, NotificationMarketReadiness>
  >
  markets: typeof NOTIFICATION_READINESS_MARKETS
  ready: boolean
  schemaVersion: 1
  scope: "four-market-notification-readiness"
  summary: Readonly<{
    errors: number
    marketsReady: number
    templatesReady: number
    templatesTotal: number
  }>
}>

export type FourMarketNotificationReadinessInput = Readonly<{
  expectedMarkets: Readonly<
    Record<NotificationReadinessMarket, NotificationMarketConfiguration>
  >
  inspector?: NotificationTemplateInspector
  observedMarkets: Readonly<
    Record<NotificationReadinessMarket, NotificationMarketConfiguration>
  >
  renderer: NotificationTemplateRenderer
  subjectResolver?: (
    template: NotificationCriticalTemplate,
    locale: ResendEmailLocale
  ) => string | undefined
}>
