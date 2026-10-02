import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_assessments",
  title: "List assessments",
  description:
    "List assessments in the signed-in user's organisation, with status, subject, topic and grade.",
  inputSchema: {
    status: z.enum(["draft", "published", "assigned", "archived"]).optional(),
    subject: z.string().trim().min(1).optional().describe("e.g. Mathematics or Science."),
    limit: z.number().int().min(1).max(100).default(25),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, subject, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("assessments")
      .select("id, title, description, kind, status, subject, topic, grade, time_limit_minutes, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (status) query = query.eq("status", status);
    if (subject) query = query.eq("subject", subject);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { assessments: data ?? [] },
    };
  },
});
