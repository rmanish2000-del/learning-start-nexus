import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CENTRE_SETUP_QUERY_KEY } from "@/components/centre-setup-checklist";
import {
  createSampleWorkspaceFn,
  getCentreSetupFn,
  removeSampleWorkspaceFn,
} from "@/lib/centre-setup.functions";

/** Settings → Sample Workspace: load or remove the labelled SAMPLE data in one action. */
export function SampleWorkspaceCard() {
  const queryClient = useQueryClient();
  const fetchSetup = useServerFn(getCentreSetupFn);
  const createSample = useServerFn(createSampleWorkspaceFn);
  const removeSample = useServerFn(removeSampleWorkspaceFn);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useQuery({ queryKey: CENTRE_SETUP_QUERY_KEY, queryFn: () => fetchSetup() });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: CENTRE_SETUP_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["learners"] });
    void queryClient.invalidateQueries({ queryKey: ["session-count"] });
    void queryClient.invalidateQueries({ queryKey: ["class-board"] });
    void queryClient.invalidateQueries({ queryKey: ["closure-header"] });
  };

  const createMutation = useMutation({
    mutationFn: () => createSample(),
    onSuccess: () => {
      toast.success("Sample workspace loaded. Everything it adds is labelled SAMPLE.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeSample(),
    onSuccess: () => {
      toast.success("Sample workspace removed.");
      setConfirmOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = query.data?.sampleActive ?? false;
  const n = query.data?.sampleLearnerCount ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="h-4 w-4" /> Sample workspace
        </CardTitle>
        <CardDescription>
          Generated learners, assessments and reports for exploring EduOS. Always labelled SAMPLE,
          never counted in reports, billing, compliance or evidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {query.isPending ? (
          <Skeleton className="h-9 w-56" />
        ) : query.isError ? (
          <p className="text-muted-foreground">Couldn't check the sample workspace right now.</p>
        ) : active ? (
          <>
            <p className="text-muted-foreground">
              Active — {n} sample learners, 3 sample assessments. Removal deletes all of it in one
              transaction and is logged with your account.
            </p>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove sample workspace
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">Not loaded. Your centre holds real data only.</p>
            <Button
              variant="outline"
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Loading…" : "Load sample workspace"}
            </Button>
          </>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove the sample workspace?</DialogTitle>
            <DialogDescription>
              This permanently deletes the {n} SAMPLE learners, their 3 sample assessments and every
              sample session in one step. Real learners and real data are not touched. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={removeMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
