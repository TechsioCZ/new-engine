import type { NotificationDTO } from "@medusajs/framework/types"

type NotificationDeliveryResult = Pick<NotificationDTO, "status">

const isNotificationDeliveryResult = (
  value: unknown
): value is NotificationDeliveryResult =>
  typeof value === "object" &&
  value !== null &&
  "status" in value &&
  typeof value.status === "string"

export const didNotificationDeliverySucceed = (
  notification: unknown
): boolean => {
  const notifications = Array.isArray(notification)
    ? notification
    : [notification]

  return (
    notifications.length > 0 &&
    notifications.every(
      (result) =>
        isNotificationDeliveryResult(result) && result.status === "success"
    )
  )
}
