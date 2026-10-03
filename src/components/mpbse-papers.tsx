// MPBSE Class 10 paper practice panel. English-only, like the rest of EduOS
// (founder decision 2026-10-03). Official papers are linked, never reproduced.
import { Link } from "@tanstack/react-router";
import { ExternalLink, FileText, Target } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import registry from "../../content/mpbse/mpbse-class10-sample-papers.json";

export type MpbseRecord = {
  id: string;
  exam_year: number;
  subject: string;
  maths_stream?: string | null;
  status: string;
  official_url?: string | null;
  pdf_pages?: number | null;
  bytes?: number | null;
  sha256?: string | null;
  document_type: string;
};

export const MPBSE_RECORDS = (registry as { records: MpbseRecord[] }).records;

export function MpbsePapers() {
  const [year, setYear] = useState<number | "all">("all");
  const [subject, setSubject] = useState<string | "all">("all");
  const [stream, setStream] = useState<string | "all">("all");

  const verified = MPBSE_RECORDS.filter((r) => r.status === "VERIFIED");
  const missing = MPBSE_RECORDS.filter((r) => r.status !== "VERIFIED");
  const years = [...new Set(verified.map((r) => r.exam_year))].sort((a, b) => b - a);
  const shown = useMemo(
    () =>
      verified.filter(
        (r) =>
          (year === "all" || r.exam_year === year) &&
          (subject === "all" || r.subject === subject) &&
          (stream === "all" || (r.maths_stream ?? "") === stream),
      ),
    [verified, year, subject, stream],
  );
  const missingYears = [...new Set(missing.map((r) => r.exam_year))].sort();

  return (
    <section lang="en" className="space-y-4" aria-label="MPBSE">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Official MPBSE Class 10 model papers. Papers open on mpbse.nic.in — EduOS does not reproduce
        paper text.
      </p>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Year">
        <FilterBtn on={year === "all"} onClick={() => setYear("all")}>
          All years
        </FilterBtn>
        {years.map((y) => (
          <FilterBtn key={y} on={year === y} onClick={() => setYear(y)}>
            {y}
          </FilterBtn>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Subject">
        <FilterBtn on={subject === "all"} onClick={() => setSubject("all")}>
          All subjects
        </FilterBtn>
        {["Mathematics", "Science"].map((s) => (
          <FilterBtn
            key={s}
            on={subject === s}
            onClick={() => {
              setSubject(s);
              if (s === "Science") setStream("all");
            }}
          >
            {s}
          </FilterBtn>
        ))}
        {subject !== "Science" &&
          ["Basic", "Standard"].map((s) => (
            <FilterBtn
              key={s}
              on={stream === s}
              onClick={() => setStream(stream === s ? "all" : s)}
            >
              Maths {s}
            </FilterBtn>
          ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((r) => (
          <Card key={r.id} data-testid="mpbse-paper">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" aria-hidden />
                {r.exam_year} · {r.subject}
                {r.maths_stream && <Badge variant="secondary">{r.maths_stream}</Badge>}
              </CardTitle>
              <CardDescription>Official model paper · {r.pdf_pages} pages</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={r.official_url ?? "#"} target="_blank" rel="noopener noreferrer">
                  Open on mpbse.nic.in <ExternalLink className="ml-1 h-3 w-3" aria-hidden />
                </a>
              </Button>
              <Button size="sm" variant="secondary" disabled aria-describedby="mpbse-practice-note">
                MPBSE practice coming soon
              </Button>
            </CardContent>
          </Card>
        ))}
        {shown.length === 0 && (
          <p className="text-muted-foreground text-sm">No papers for this selection.</p>
        )}
      </div>

      <p id="mpbse-practice-note" className="text-muted-foreground text-sm">
        Original EduOS questions for MPBSE are not ready yet, so practice is turned off. CBSE
        practice is available under the CBSE button.
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" aria-hidden /> Weak chapters
          </CardTitle>
          <CardDescription>Practice results feed your learning gaps.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/gap-analysis">See my gaps</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Not available on the official site: {missingYears.join(", ")}
      </p>
    </section>
  );
}

function FilterBtn({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button size="sm" variant={on ? "default" : "outline"} aria-pressed={on} onClick={onClick}>
      {children}
    </Button>
  );
}
