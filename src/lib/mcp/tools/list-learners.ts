import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_learners",
  title: "List learners",
  description:
    "List learners visible to the signed-in EduOS user, with grade, subject, handle and mastery score.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Optional name or handle filter."),
    limit: z.number().int().min(1).max(100).default(25).describe("Maximum learners to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("learners")
      .select("id, full_name, handle, grade, subject, board, status, learner_mode, mastery_score, mastery_lift")
      .order("full_name", { ascending: true })
      .limit(limit ?? 25);
    if (search) query = query.or(`full_name.ilike.%${search}%,handle.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { learners: data ?? [] },
    };
  },
});
