import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { openOutcomeForIntervention } from "@/lib/outcomes.server";
for (const id of ["94ac6c19-a2ef-47a0-810c-c4442ca8925f","8267f15a-45cb-4d0a-ab46-27f309675118"]) {
  console.log(id, JSON.stringify(await openOutcomeForIntervention(supabaseAdmin as any, id)));
}
