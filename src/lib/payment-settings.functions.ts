// Admin payment settings — thin server-function wrappers.
//
// Secret values are write-only: nothing here ever returns a key secret or
// webhook secret to the browser, only masked status.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAnyRole } from "./admin.server";

export const getPaymentSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
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
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
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
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { clearRazorpayCredentials, razorpayCredentialStatus } = await import(
      "./payment-credentials.server"
    );
    await clearRazorpayCredentials(context.userId);
    return razorpayCredentialStatus();
  });

export const listPaymentAuditFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { listCredentialAudit } = await import("./payment-credentials.server");
    return listCredentialAudit();
  });

export const testPaymentSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAnyRole(context.supabase, context.userId, ["admin"]);
    const { testRazorpayCredentials } = await import("./payment-credentials.server");
    return testRazorpayCredentials();
  });
