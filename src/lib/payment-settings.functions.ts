// Founder-only payment settings — thin server-function wrappers.
//
// Secret values are write-only: nothing here ever returns a key secret or
// webhook secret to the browser, only masked status.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireFounder } from "./founder.server";

export const getPaymentSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context.supabase, "payment:getPaymentSettingsFn");
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
    await requireFounder(context.supabase, "payment:savePaymentSettingsFn");
    const { saveRazorpayCredentials, razorpayCredentialStatus } = await import(
      "./payment-credentials.server"
    );
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
    await requireFounder(context.supabase, "payment:clearPaymentSettingsFn");
    const { clearRazorpayCredentials, razorpayCredentialStatus } = await import(
      "./payment-credentials.server"
    );
    await clearRazorpayCredentials(context.userId);
    return razorpayCredentialStatus();
  });

export const listPaymentAuditFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context.supabase, "payment:listPaymentAuditFn");
    const { listCredentialAudit } = await import("./payment-credentials.server");
    return listCredentialAudit();
  });

export const testPaymentSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context.supabase, "payment:testPaymentSettingsFn");
    const { testRazorpayCredentials } = await import("./payment-credentials.server");
    return testRazorpayCredentials(context.userId);
  });

export const getWebhookStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireFounder(context.supabase, "payment:getWebhookStatusFn");
    const { getWebhookStatus } = await import("./payment-observability.server");
    return getWebhookStatus();
  });
