import { useState } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Image as ImageIcon, Inbox, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FEEDBACK_AREAS,
  FEEDBACK_PRIORITIES,
  FEEDBACK_REPRODUCTION,
  FEEDBACK_STATUSES,
} from "@/lib/feedback-shared";
import {
  feedbackScreenshotUrlFn,
  guidanceCountsFn,
  listFeedbackFn,
  updateFeedbackFn,
} from "@/lib/feedback.functions";

export const Route = createFileRoute("/_authenticated/feedback-review")({
  head: () => ({
    meta: [
      { title: "Feedback review — EduOS" },
      { name: "description", content: "Admin-only review of visitor feedback and guidance funnel activity." },
      { property: "og:title", content: "Feedback review — EduOS" },
      { property: "og:description", content: "Admin-only review of visitor feedback and guidance funnel activity." },
    ],
  }),
  component: FeedbackReviewPage,
});

const authRoute = getRouteApi("/_authenticated");

function FeedbackReviewPage() {
  const { role } = authRoute.useRouteContext();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");

  const feedback = useQuery({
    queryKey: ["feedback-review", status],
    queryFn: () =>
      listFeedbackFn({ data: { limit: 100, ...(status === "all" ? {} : { status: status as never }) } }),
    enabled: role === "admin",
  });

  const counts = useQuery({
    queryKey: ["guidance-counts"],
    queryFn: () => guidanceCountsFn({ data: { days: 30 } }),
    enabled: role === "admin",
  });

  const update = useMutation({
    mutationFn: (input: { id: string } & Record<string, string>) => updateFeedbackFn({ data: input as never }),
    onSuccess: () => {
      toast.success("Saved");
      void queryClient.invalidateQueries({ queryKey: ["feedback-review"] });
    },
    onError: () => toast.error("We couldn't save that change."),
  });

  if (role !== "admin") {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Administrators only</p>
          <p className="text-xs text-muted-foreground">Feedback review is restricted to admin accounts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Feedback review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What visitors told us, plus the guidance funnel for the last 30 days.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" /> Guidance activity (30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {counts.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (counts.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No guidance activity recorded yet.</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {(counts.data ?? []).map((row) => (
                <li key={`${row.name}-${row.cta ?? ""}`} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-muted-foreground">
                    {row.name}
                    {row.cta ? ` · ${row.cta}` : ""}
                  </span>
                  <span className="font-medium tabular-nums">{row.total}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-48 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {FEEDBACK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {feedback.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (feedback.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No feedback yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(feedback.data ?? []).map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              saving={update.isPending}
              onSave={(patch) => update.mutate({ id: item.id, ...patch })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Item = Awaited<ReturnType<typeof listFeedbackFn>>[number];

function FeedbackCard({
  item,
  saving,
  onSave,
}: {
  item: Item;
  saving: boolean;
  onSave: (patch: Record<string, string>) => void;
}) {
  const [notes, setNotes] = useState(item.resolutionNotes ?? "");
  const [shotUrl, setShotUrl] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
          <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
          <Badge variant="outline" className="text-[10px]">{item.priority}</Badge>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {new Date(item.createdAt).toLocaleString()}
          </span>
        </div>

        <p className="text-sm leading-relaxed break-words">{item.message}</p>

        <p className="text-[11px] break-words text-muted-foreground">
          {item.route} · {item.deviceClass}
          {item.viewport ? ` ${item.viewport}` : ""} · {item.browserFamily ?? "unknown"} ·{" "}
          {item.isAuthenticated ? "signed in" : "anonymous"}
          {item.contactEmail ? ` · reply to ${item.contactEmail}` : ""}
        </p>

        {item.hasScreenshot && (
          <div>
            {shotUrl ? (
              <img src={shotUrl} alt="Attached screenshot" className="max-h-64 rounded-md border" />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={async () => {
                  const { url } = await feedbackScreenshotUrlFn({ data: { id: item.id } });
                  setShotUrl(url);
                }}
              >
                <ImageIcon className="h-3.5 w-3.5" /> View screenshot
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <TriageSelect label="Status" value={item.status} options={[...FEEDBACK_STATUSES]} onChange={(v) => onSave({ status: v })} />
          <TriageSelect label="Priority" value={item.priority} options={[...FEEDBACK_PRIORITIES]} onChange={(v) => onSave({ priority: v })} />
          <TriageSelect label="Reproduction" value={item.reproduction} options={[...FEEDBACK_REPRODUCTION]} onChange={(v) => onSave({ reproduction: v })} />
          <TriageSelect label="Product area" value={item.productArea} options={[...FEEDBACK_AREAS]} onChange={(v) => onSave({ productArea: v })} />
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Resolution notes"
          className="text-sm"
        />
        <Button size="sm" variant="outline" disabled={saving} onClick={() => onSave({ resolutionNotes: notes })}>
          Save notes
        </Button>
      </CardContent>
    </Card>
  );
}

function TriageSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-[11px] text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
