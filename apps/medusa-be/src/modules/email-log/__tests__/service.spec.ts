import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it } from "vitest"
import { EMAIL_LOG_MODULE } from "../index"
import EmailLog from "../models/email-log"
import EmailWebhookEvent from "../models/email-webhook-event"
import type EmailLogModuleService from "../service"

moduleIntegrationTestRunner<EmailLogModuleService>({
  moduleName: EMAIL_LOG_MODULE,
  moduleModels: [EmailLog, EmailWebhookEvent],
  resolve: "./src/modules/email-log",
  testSuite: ({ service }) => {
    describe("recordEmailWebhookEventOnce", () => {
      it("persists one pending event for repeated Svix delivery ids", async () => {
        const input = {
          email_id: "email_123",
          event_id: "message_123",
          payload: {
            data: { email_id: "email_123" },
            type: "email.delivered",
          },
          received_at: new Date(),
          type: "email.delivered",
        }

        await service.recordEmailWebhookEventOnce(input)
        await service.recordEmailWebhookEventOnce(input)

        const events = await service.listEmailWebhookEvents({
          event_id: input.event_id,
        })

        expect(events).toHaveLength(1)
        expect(events[0]).toEqual(
          expect.objectContaining({
            email_id: input.email_id,
            event_id: input.event_id,
            payload: input.payload,
            type: input.type,
          })
        )
      })
    })
  },
})
