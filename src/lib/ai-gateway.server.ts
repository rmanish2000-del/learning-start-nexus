// Shared Lovable AI Gateway provider helper (server-only).
// Non-OpenAI vendors (e.g. google/gemini-*) go through this
// openai-compatible chat path; the key travels in the Lovable-API-Key header.

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
}
