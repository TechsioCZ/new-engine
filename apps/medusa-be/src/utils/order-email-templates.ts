export type OrderEmailTemplate = {
  label: string
  subject: string
  template: string
  trigger_type: string
}

export const orderEmailTemplates = [
  {
    label: "Payment reminder",
    subject: "Zaplaťte prosím svou objednávku",
    template: "order-payment-reminder",
    trigger_type: "order.payment_reminder",
  },
] satisfies OrderEmailTemplate[]

export function isOrderEmailTemplate(
  template: string | undefined
): template is string {
  return orderEmailTemplates.some((item) => item.template === template)
}

export function getOrderEmailTemplate(template: string) {
  return orderEmailTemplates.find((item) => item.template === template)
}
