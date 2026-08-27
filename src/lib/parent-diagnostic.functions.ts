// Authenticated RPC surface for the ₹199 parent diagnostic.
//
// Identity-first: every wrapper requires a bearer token, and the server layer
// re-checks that the caller owns the order before reading or writing it.
// Thin wrappers only — validation with zod, then delegate to
// parent-diagnostic.server.ts.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  answerSchema,
  createDiagnosticOrderSchema,
  createUpgradeOrderSchema,
  orderRefSchema,
  paymentFailureSchema,
  setupDiagnosticSchema,
  tokenSchema,
  verifyPaymentSchema,
} from "./parent-diagnostic-shared";

// The catalogue is the only public read: it is the shop window, it contains
// no learner data, and it is needed before sign-in to show what is on sale.
export const getDiagnosticCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchDiagnosticCatalog } = await import("./parent-diagnostic.server");
  return fetchDiagnosticCatalog();
});

// Purchase guard lives in createDiagnosticOrder: authenticated caller, parent
// profile, owned student profile. Anonymous purchase is impossible.
export const startDiagnosticOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createDiagnosticOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { createDiagnosticOrder } = await import("./parent-diagnostic.server");
    return createDiagnosticOrder({ ...data, userId: context.userId });
  });

export const fetchOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orderRefSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { getOrder } = await import("./parent-diagnostic.server");
    return getOrder(data.orderRef, context.userId);
  });

// Creates the Razorpay order the browser checkout will pay. The amount is
// always read from the stored order server-side, and the order must belong to
// the caller and to one of the caller's students.
export const createPaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orderRefSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { startRazorpayCheckout } = await import("./parent-diagnostic.server");
    return startRazorpayCheckout(data.orderRef, context.userId);
  });

// Verifies the checkout handler signature and captures the order. The
// payment.captured webhook is the redundant path for the same capture.
export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => verifyPaymentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { verifyRazorpayCheckout } = await import("./parent-diagnostic.server");
    return verifyRazorpayCheckout({ ...data, userId: context.userId });
  });

export const reportPaymentFailure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => paymentFailureSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { recordRazorpayFailure } = await import("./parent-diagnostic.server");
    return recordRazorpayFailure({ ...data, userId: context.userId });
  });

export const completeDiagnosticSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => setupDiagnosticSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { setupDiagnostic } = await import("./parent-diagnostic.server");
    return setupDiagnostic({ orderRef: data.orderRef, userId: context.userId });
  });

export const fetchDiagnosticRun = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { loadRun } = await import("./parent-diagnostic.server");
    return loadRun(data.token, context.userId);
  });

export const saveDiagnosticAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => answerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveRunAnswer } = await import("./parent-diagnostic.server");
    return saveRunAnswer({ ...data, userId: context.userId });
  });

export const submitDiagnosticRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { submitRun } = await import("./parent-diagnostic.server");
    return submitRun(data.token, context.userId);
  });

export const fetchDiagnosticReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { loadReport } = await import("./parent-diagnostic.server");
    return loadReport(data.token, context.userId);
  });

export const startUpgradeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createUpgradeOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { createUpgradeOrder } = await import("./parent-diagnostic.server");
    return createUpgradeOrder(data.token, context.userId);
  });

// Parent-only handoff view: what to hand to the learner after payment. The
// parent never receives the question paper from this call.
export const fetchDiagnosticHandoff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { loadHandoff } = await import("./parent-diagnostic.server");
    return loadHandoff(data.token, context.userId);
  });

// Learner-only completion confirmation shown after submitting.
export const fetchRunCompletion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { loadRunCompletion } = await import("./parent-diagnostic.server");
    return loadRunCompletion(data.token, context.userId);
  });
