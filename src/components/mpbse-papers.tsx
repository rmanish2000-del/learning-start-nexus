// MPBSE Class 10 paper practice panel. Hindi by default (user decision 2026-10-02);
// the rest of EduOS stays English. Official papers are linked, never reproduced.
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

const SUBJECT_HI: Record<string, string> = { Mathematics: "गणित", Science: "विज्ञान" };
const STREAM_HI: Record<string, string> = { Basic: "बेसिक", Standard: "स्टैंडर्ड" };

export function MpbsePapers() {
  const [english, setEnglish] = useState(false);
  const [year, setYear] = useState<number | "all">("all");
  const [subject, setSubject] = useState<string | "all">("all");
  const [stream, setStream] = useState<string | "all">("all");
  const L = (hi: string, en: string) => (english ? en : hi);

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
    <section lang={english ? "en" : "hi"} className="space-y-4" aria-label="MPBSE">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground max-w-3xl text-sm">
          {L(
            "एमपी बोर्ड (MPBSE) कक्षा 10 के आधिकारिक मॉडल पेपर। पेपर mpbse.nic.in पर खुलते हैं — EduOS पेपर का पाठ नहीं दोहराता।",
            "Official MPBSE Class 10 model papers. Papers open on mpbse.nic.in — EduOS does not reproduce paper text.",
          )}
        </p>
        <Button size="sm" variant="ghost" onClick={() => setEnglish((v) => !v)}>
          {english ? "हिंदी" : "English"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={L("वर्ष", "Year")}>
        <FilterBtn on={year === "all"} onClick={() => setYear("all")}>
          {L("सभी वर्ष", "All years")}
        </FilterBtn>
        {years.map((y) => (
          <FilterBtn key={y} on={year === y} onClick={() => setYear(y)}>
            {y}
          </FilterBtn>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={L("विषय", "Subject")}>
        <FilterBtn on={subject === "all"} onClick={() => setSubject("all")}>
          {L("सभी विषय", "All subjects")}
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
            {english ? s : SUBJECT_HI[s]}
          </FilterBtn>
        ))}
        {subject !== "Science" &&
          ["Basic", "Standard"].map((s) => (
            <FilterBtn
              key={s}
              on={stream === s}
              onClick={() => setStream(stream === s ? "all" : s)}
            >
              {L(`गणित ${STREAM_HI[s]}`, `Maths ${s}`)}
            </FilterBtn>
          ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((r) => (
          <Card key={r.id} data-testid="mpbse-paper">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" aria-hidden />
                {r.exam_year} · {english ? r.subject : SUBJECT_HI[r.subject]}
                {r.maths_stream && (
                  <Badge variant="secondary">
                    {english ? r.maths_stream : STREAM_HI[r.maths_stream]}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {L("आधिकारिक मॉडल पेपर", "Official model paper")} · {r.pdf_pages}{" "}
                {L("पृष्ठ", "pages")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={r.official_url ?? "#"} target="_blank" rel="noopener noreferrer">
                  {L("mpbse.nic.in पर खोलें", "Open on mpbse.nic.in")}{" "}
                  <ExternalLink className="ml-1 h-3 w-3" aria-hidden />
                </a>
              </Button>
              <Button size="sm" variant="secondary" disabled aria-describedby="mpbse-practice-note">
                {L("MPBSE अभ्यास जल्द आ रहा है", "MPBSE practice coming soon")}
              </Button>
            </CardContent>
          </Card>
        ))}
        {shown.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {L("इस चयन के लिए कोई पेपर नहीं।", "No papers for this selection.")}
          </p>
        )}
      </div>

      <p id="mpbse-practice-note" className="text-muted-foreground text-sm">
        {L(
          "MPBSE के लिए EduOS के मूल प्रश्न अभी तैयार नहीं हैं, इसलिए अभ्यास बंद है। CBSE अभ्यास CBSE बटन से उपलब्ध है।",
          "Original EduOS questions for MPBSE are not ready yet, so practice is turned off. CBSE practice is available under the CBSE button.",
        )}
      </p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" aria-hidden /> {L("कमज़ोर अध्याय", "Weak chapters")}
          </CardTitle>
          <CardDescription>
            {L(
              "अभ्यास के परिणाम आपकी सीखने की कमियों से जुड़ते हैं।",
              "Practice results feed your learning gaps.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link to="/gap-analysis">{L("मेरी कमियाँ देखें", "See my gaps")}</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        {L("आधिकारिक साइट पर उपलब्ध नहीं:", "Not available on the official site:")}{" "}
        {missingYears.join(", ")}
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
