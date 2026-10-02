// Payment settings — thin server-function wrappers.
//
// Platform-owner only: Razorpay keys are a single platform-wide row, so no
// centre admin (even with the `admin` role) may read, test, save or clear them.
// Secret values are write-only: nothing here ever returns a key secret or
// webhook secret to the browser, only masked status.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePlatformOwner } from "./platform-owner.server";

export const getPaymentSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformOwner(context);
    const { razorpayCredentialStatus } = await import("./payment-credentials.server");
    return razorpayCredentialStatus();
  });

export const savePaymentSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        keyId: z.string().min(1),
        keySecret: z.string().min(1),
        webhookSecret: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await requirePlatformOwner(context);
    const { saveRazorpayCredentials, razorpayCredentialStatus } =
      await import("./payment-credentials.server");
    await saveRazorpayCredentials({
      keyId: data.keyId,
      keySecret: data.keySecret,
      webhookSecret: data.webhookSecret ?? null,
      updatedBy: context.userId,
    });
    return razorpayCredentialStatus();
  });

export const clearPaymentSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformOwner(context);
    const { clearRazorpayCredentials, razorpayCredentialStatus } =
      await import("./payment-credentials.server");
    await clearRazorpayCredentials(context.userId);
    return razorpayCredentialStatus();
  });

export const listPaymentAuditFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformOwner(context);
    const { listCredentialAudit } = await import("./payment-credentials.server");
    return listCredentialAudit();
  });

export const testPaymentSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformOwner(context);
    const { testRazorpayCredentials } = await import("./payment-credentials.server");
    return testRazorpayCredentials(context.userId);
  });

export const getWebhookStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformOwner(context);
    const { getWebhookStatus } = await import("./payment-observability.server");
    return getWebhookStatus();
  });
