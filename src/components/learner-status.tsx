import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type Learner = Database["public"]["Tables"]["learners"]["Row"];

export function statusBadge(status: Learner["status"]) {
  if (status === "needs_attention") return <Badge variant="destructive">Needs attention</Badge>;
  if (status === "paused") return <Badge variant="outline">Paused</Badge>;
  return <Badge variant="secondary">Active</Badge>;
}

export function liftText(lift: number) {
  const rounded = Math.round(lift * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}
