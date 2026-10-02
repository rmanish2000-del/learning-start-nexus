// Public pilot invitation landing page.
//
// A visitor arrives signed out. The page states whether the link still works,
// then asks the invited parent to sign in (Google or password) and accept.
// Accepting creates free pilot access — never an order or a payment.
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Gift, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptPilotInvitationFn,
  previewPilotInvitationFn,
} from "@/lib/pilot-invitations.functions";
import { friendlyErrorMessage } from "@/lib/user-errors";

export const Route = createFileRoute("/pilot-invite/$token")({
  component: PilotInvitePage,
  head: () => ({
    meta: [
      { title: "Your EduOS pilot invitation" },
      {
        name: "description",
        content:
          "Accept your EduOS pilot invitation to unlock the full learning journey for your child — free, with no payment.",
      },
      { property: "og:title", content: "Your EduOS pilot invitation" },
      {
        property: "og:description",
        content: "Accept your invitation to start your child's free EduOS pilot journey.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const MESSAGES: Record<string, string> = {
  accepted: "This invitation has already been accepted.",
  expired: "This invitation has expired. Ask your centre for a new link.",
  revoked: "This invitation was withdrawn. Ask your centre for a new link.",
  invalid: "This invitation link is not valid.",
};

function PilotInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const previewFn = useServerFn(previewPilotInvitationFn);
  const acceptFn = useServerFn(acceptPilotInvitationFn);

  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setSignedInEmail(data.user?.email ?? null);
      setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const preview = useQuery({
    queryKey: ["pilot-invitation", token],
    queryFn: () => previewFn({ data: { token } }),
  });

  const accept = useMutation({
    mutationFn: () => acceptFn({ data: { token } }),
    onSuccess: async () => {
      toast.success("Pilot access unlocked. Welcome to EduOS.");
      await navigate({ to: "/parent" });
    },
    onError: (error) =>
      toast.error(friendlyErrorMessage(error, "We could not accept this invitation.")),
  });

  const onGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (result.error) {
      toast.error(friendlyErrorMessage(result.error, "Google sign-in did not complete."));
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getUser();
    setSignedInEmail(data.user?.email ?? null);
  };

  const state = preview.data?.state;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Gift className="h-5 w-5 text-primary" /> Your EduOS pilot invitation
          </CardTitle>
          <CardDescription>
            Free pilot access to the full journey — diagnostic, report, learning gaps, Study Plan, AI
            Tutor and reassessment. No payment, ever.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {preview.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : state !== "valid" ? (
            <p className="text-sm text-muted-foreground" data-testid="invite-state">
              {MESSAGES[state ?? "invalid"]}
            </p>
          ) : (
            <>
              <div className="space-y-1 rounded-lg border p-4 text-sm" data-testid="invite-state">
                <p>
                  Invited account: <span className="font-medium">{preview.data?.maskedEmail}</span>
                </p>
                <p className="text-muted-foreground">
                  {preview.data?.subject ?? "Mathematics and Science"} ·{" "}
                  {preview.data?.days} days of free access
                </p>
              </div>

              {checkingSession ? (
                <Skeleton className="h-10 w-full" />
              ) : signedInEmail ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Signed in as {signedInEmail}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => accept.mutate()}
                    disabled={accept.isPending}
                  >
                    {accept.isPending ? "Accepting…" : "Accept invitation"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => void onGoogle()}>
                    Continue with Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void navigate({ to: "/auth", search: { tab: "parent" } })}
                  >
                    Sign in another way
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Use the same email this invitation was sent to, then return to this link.
                  </p>
                </div>
              )}
            </>
          )}

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This link works once and only for the invited account. Accepting creates no order,
            payment or invoice.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
