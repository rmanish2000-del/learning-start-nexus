import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_learner_gaps",
  title: "Get learner gaps",
  description:
    "Return detected learning gaps for one learner, including topic, subtopic, severity, status and gap score.",
  inputSchema: {
    learner_id: z.string().uuid().describe("Learner id from list_learners."),
    status: z.enum(["open", "in_progress", "resolved"]).optional().describe("Optional status filter."),
    limit: z.number().int().min(1).max(100).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ learner_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("learning_gaps")
      .select("id, subject, topic, subtopic, severity, status, gap_score_pct, items_correct, items_total, detected_at")
      .eq("learner_id", learner_id)
      .order("gap_score_pct", { ascending: true })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { gaps: data ?? [] },
    };
  },
});
