import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/** Current auth user, kept fresh across sign-in / sign-out in the same tab. */
export function useSupabaseUser() {
  const queryClient = useQueryClient();

  const query = useQuery<User | null>({
    queryKey: ["supabase-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user ?? null,
    staleTime: 30_000,
  });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: ["supabase-user"] });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  return query;
}
