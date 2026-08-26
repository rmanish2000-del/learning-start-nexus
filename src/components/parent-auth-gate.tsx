import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";

import { useSupabaseUser } from "@/lib/use-supabase-user";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Identity gate for every paid parent surface. Anonymous purchase is disabled
 * by design: the account must exist before an order can be created, so the
 * page renders a sign-in / create-account card instead of the purchase UI.
 */
export function ParentAuthGate({ next, children }: { next: string; children: ReactNode }) {
  const { t } = useI18n();
  const { data: user, isLoading } = useSupabaseUser();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (user) return <>{children}</>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {t("gate.title", "Sign in to continue")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t(
            "gate.body",
            "Every diagnostic belongs to a parent account and a student profile, so the report, the plan and the receipts stay yours even if you lose the link. It takes under a minute.",
          )}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link to="/auth" search={{ tab: "parent", mode: "signup", next }}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t("gate.create", "Create a parent account")}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth" search={{ tab: "parent", mode: "signin", next }}>
              <LogIn className="mr-2 h-4 w-4" />
              {t("gate.signin", "I already have an account")}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
