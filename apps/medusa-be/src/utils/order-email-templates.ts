import {
  getResendTemplateSubject,
  resendEmailTemplates,
} from "../modules/resend/templates"

export const ALLOWED_ORDER_EMAIL_TEMPLATES = [
  resendEmailTemplates.ORDER_PAYMENT_REMINDER,
] as const

export type OrderEmailTemplateName =
  (typeof ALLOWED_ORDER_EMAIL_TEMPLATES)[number]

export type OrderEmailTemplate = {
  label: string
  subject: string | undefined
  template: OrderEmailTemplateName
  trigger_type: string
}

export const orderEmailTemplates = [
  {
    label: "Payment reminder",
    subject: getResendTemplateSubject(
      resendEmailTemplates.ORDER_PAYMENT_REMINDER
    ),
    template: resendEmailTemplates.ORDER_PAYMENT_REMINDER,
    trigger_type: "order.payment_reminder",
  },
] satisfies OrderEmailTemplate[]

export function isOrderEmailTemplate(
  template: string | undefined
): template is OrderEmailTemplateName {
  return orderEmailTemplates.some((item) => item.template === template)
}

export function getOrderEmailTemplate(template: OrderEmailTemplateName) {
  return orderEmailTemplates.find((item) => item.template === template)
}
