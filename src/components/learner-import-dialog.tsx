import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { importLearners } from "@/lib/centre-onboarding.functions";
import {
  CSV_TEMPLATE,
  parseLearnerCsv,
  type ParsedImport,
} from "@/lib/centre-onboarding-shared";

/**
 * Bulk roster upload for a centre. Parsing and preview happen client-side; the
 * server function creates the learner records and student logins.
 */
export function LearnerImportDialog() {
  const queryClient = useQueryClient();
  const importFn = useServerFn(importLearners);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [fileName, setFileName] = useState("");

  const mutation = useMutation({
    mutationFn: () => importFn({ data: { rows: parsed?.rows ?? [] } }),
    onSuccess: (result) => {
      toast.success(
        `Imported ${result.created.length} learner${result.created.length === 1 ? "" : "s"}.` +
          (result.failed.length ? ` ${result.failed.length} row(s) skipped.` : ""),
      );
      if (result.failed.length) {
        setParsed({
          rows: [],
          errors: result.failed.map((f, i) => ({ line: i + 1, message: `${f.handle}: ${f.message}` })),
        });
      } else {
        setParsed(null);
        setFileName("");
        setOpen(false);
      }
      void queryClient.invalidateQueries({ queryKey: ["learners"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setParsed(parseLearnerCsv(await file.text()));
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "eduos-learner-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import learners</DialogTitle>
          <DialogDescription>
            Upload a roster with columns: full_name, handle, pin, grade, subject. Each learner gets
            a student sign-in immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="px-0">
            Download CSV template
          </Button>
          <div className="space-y-2">
            <Label htmlFor="roster-file">Roster file</Label>
            <input
              id="roster-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            {fileName ? <p className="text-xs text-muted-foreground">{fileName}</p> : null}
          </div>

          {parsed ? (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <p className="font-medium">{parsed.rows.length} learner(s) ready to import</p>
              {parsed.errors.length > 0 ? (
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-destructive">
                  {parsed.errors.map((e) => (
                    <li key={`${e.line}-${e.message}`}>Line {e.line}: {e.message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={!parsed || parsed.rows.length === 0 || mutation.isPending}
            >
              {mutation.isPending ? "Importing…" : "Import learners"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
