// Payment Audit dashboard — thin server-function wrappers.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPaymentAudit } from "./payment-audit.server";
import { requirePlatformOwner } from "./platform-owner.server";

// Platform-wide orders and webhook events: platform-owner only.
export const getPaymentAuditFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformOwner(context);
    return getPaymentAudit();
  });
