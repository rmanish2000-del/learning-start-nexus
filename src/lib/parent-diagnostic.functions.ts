// Public (unauthenticated) RPC surface for the ₹199 parent diagnostic.
//
// Thin wrappers only: every wrapper validates input with zod and delegates to
// parent-diagnostic.server.ts. Authorisation on this path is the per-order
// access token, checked server-side on every call.

import { createServerFn } from "@tanstack/react-start";
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

export const getDiagnosticCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchDiagnosticCatalog } = await import("./parent-diagnostic.server");
  return fetchDiagnosticCatalog();
});

export const startDiagnosticOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createDiagnosticOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { createDiagnosticOrder } = await import("./parent-diagnostic.server");
    return createDiagnosticOrder(data);
  });

export const fetchOrder = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => orderRefSchema.parse(data))
  .handler(async ({ data }) => {
    const { getOrder } = await import("./parent-diagnostic.server");
    return getOrder(data.orderRef);
  });

// Creates the Razorpay order the browser checkout will pay. The amount is
// always read from the stored order server-side.
export const createPaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => orderRefSchema.parse(data))
  .handler(async ({ data }) => {
    const { startRazorpayCheckout } = await import("./parent-diagnostic.server");
    return startRazorpayCheckout(data.orderRef);
  });

// Verifies the checkout handler signature and captures the order. The
// payment.captured webhook is the redundant path for the same capture.
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifyPaymentSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyRazorpayCheckout } = await import("./parent-diagnostic.server");
    return verifyRazorpayCheckout(data);
  });

export const reportPaymentFailure = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => paymentFailureSchema.parse(data))
  .handler(async ({ data }) => {
    const { recordRazorpayFailure } = await import("./parent-diagnostic.server");
    return recordRazorpayFailure(data);
  });

export const completeDiagnosticSetup = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => setupDiagnosticSchema.parse(data))
  .handler(async ({ data }) => {
    const { setupDiagnostic } = await import("./parent-diagnostic.server");
    return setupDiagnostic(data);
  });

export const fetchDiagnosticRun = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadRun } = await import("./parent-diagnostic.server");
    return loadRun(data.token);
  });

export const saveDiagnosticAnswer = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => answerSchema.parse(data))
  .handler(async ({ data }) => {
    const { saveRunAnswer } = await import("./parent-diagnostic.server");
    return saveRunAnswer(data);
  });

export const submitDiagnosticRun = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { submitRun } = await import("./parent-diagnostic.server");
    return submitRun(data.token);
  });

export const fetchDiagnosticReport = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadReport } = await import("./parent-diagnostic.server");
    return loadReport(data.token);
  });

export const startUpgradeOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createUpgradeOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { createUpgradeOrder } = await import("./parent-diagnostic.server");
    return createUpgradeOrder(data.token);
  });
