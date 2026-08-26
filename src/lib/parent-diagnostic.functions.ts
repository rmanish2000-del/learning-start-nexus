// Public (unauthenticated) RPC surface for the ₹199 parent diagnostic.
//
// Thin wrappers only: every wrapper validates input with zod and delegates to
// parent-diagnostic.server.ts. Authorisation on this path is the per-order
// access token, checked server-side on every call.

import { createServerFn } from "@tanstack/react-start";
import {
  answerSchema,
  confirmPaymentSchema,
  createDiagnosticOrderSchema,
  createUpgradeOrderSchema,
  orderRefSchema,
  setupDiagnosticSchema,
  tokenSchema,
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

export const payDiagnosticOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => confirmPaymentSchema.parse(data))
  .handler(async ({ data }) => {
    const { confirmDiagnosticPayment } = await import("./parent-diagnostic.server");
    return confirmDiagnosticPayment(data);
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
