import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FileText,
  Loader2,
  ShieldCheck,
  Target,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { DiagnosticShell } from "@/components/diagnostic-shell";
import { QueryError } from "@/components/query-error";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getDiagnosticCatalog, startDiagnosticOrder } from "@/lib/parent-diagnostic.functions";
import { createStudentProfile, getParentAccount } from "@/lib/parent-account.functions";
import { BOARDS, CLASSES, addStudentSchema } from "@/lib/parent-account-shared";
import { ParentAuthGate } from "@/components/parent-auth-gate";
import { useSupabaseUser } from "@/lib/use-supabase-user";
import { Input } from "@/components/ui/input";
import { PRICING, formatInr } from "@/lib/parent-diagnostic-shared";
import { useI18n } from "@/lib/i18n/context";

const TITLE = "Class 10 Diagnostic — ₹199 | EduOS";
const DESCRIPTION =
  "A CBSE Class 10 diagnostic of up to 20 questions, mapped to every learning outcome in the chapter group. See exactly where your child is losing marks, with the report in the same session.";

export const Route = createFileRoute("/diagnostic/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiagnosticPurchasePage,
});

const SELECTION_KEY = "eduos.diagnostic.selection";

const WHAT_YOU_GET = [
  {
    icon: Target,
    title: "Outcome-level mastery bands",
    detail: "Weak · Developing · Secure · Strong against every active outcome in the chapter group.",
  },
  {
    icon: ClipboardList,
    title: "The named gaps, ranked",
    detail: "Ordered by board weight × severity, with the questions missed on each one.",
  },
  {
    icon: BadgeCheck,
    title: "The recommended intervention",
    detail: "For each gap, the exact remediation our engine maps to that outcome.",
  },
  {
    icon: FileText,
    title: "A report you can keep",
    detail: "Permanently accessible from your link, whether or not you ever upgrade.",
  },
];

const FAQS = [
  {
    q: "How long does it take?",
    a: "About 20 minutes. Up to twenty questions, one per screen, and progress is saved after every answer so it can be paused and resumed on the same link.",
  },
  {
    q: "Who needs to supervise it?",
    a: "Nobody. It is not invigilated and there is no ranking. The report is only useful if it reflects what your child can do unaided, so no help is the right amount of help.",
  },
  {
    q: "Can it be done on a phone?",
    a: "Yes. The whole flow — checkout, diagnostic, and report — is built phone-first.",
  },
  {
    q: "What if my child scores badly?",
    a: "The report is written as a diagnosis, not a verdict. It names what is already secure alongside the gaps, and every gap comes with the intervention that closes it.",
  },
  {
    q: "Is the ₹199 adjusted against the plan?",
    a: `Yes. If you upgrade to the Board Success Plan within ${PRICING.creditWindowDays} days, the ₹199 is credited against year one — you pay ${formatInr(PRICING.planPaise - PRICING.creditPaise)} instead of ${formatInr(PRICING.planPaise)}.`,
  },
  {
    q: "What happens to the data?",
    a: "It is stored against your child's learning record and used only to produce the report and the plan. You can request deletion at any time from the Contact page.",
  },
];

function DiagnosticPurchasePage() {
  const { t } = useI18n();
  const catalogFn = useServerFn(getDiagnosticCatalog);
  const startFn = useServerFn(startDiagnosticOrder);
  const accountFn = useServerFn(getParentAccount);
  const addStudentFn = useServerFn(createStudentProfile);
  const navigate = useNavigate();
  const { data: user } = useSupabaseUser();

  // Identity-first: the account and its student profiles are loaded before any
  // order can be created. Anonymous visitors never reach this query.
  const account = useQuery({
    queryKey: ["parent-account"],
    queryFn: () => accountFn(),
    enabled: Boolean(user),
  });
  const students = account.data?.students ?? [];
  const [learnerId, setLearnerId] = useState<string>("");
  const [newStudent, setNewStudent] = useState({ fullName: "", grade: "10", board: "CBSE" });
  const [addingStudent, setAddingStudent] = useState(false);

  const activeStudentId = learnerId || (students.length === 1 ? students[0]!.id : "");

  async function addStudent() {
    const parsed = addStudentSchema.safeParse({
      fullName: newStudent.fullName,
      grade: Number(newStudent.grade),
      board: newStudent.board,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the student details.");
      return;
    }
    setAddingStudent(true);
    try {
      const created = await addStudentFn({ data: parsed.data });
      setLearnerId(created.id);
      setNewStudent({ fullName: "", grade: "10", board: "CBSE" });
      await account.refetch();
      toast.success("Student profile added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the student.");
    } finally {
      setAddingStudent(false);
    }
  }

  const query = useQuery({ queryKey: ["diagnostic-catalog"], queryFn: () => catalogFn() });
  const catalog = query.data ?? [];

  const [bookId, setBookId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
  const [pending, setPending] = useState(false);

  const subject = useMemo(() => catalog.find((c) => c.bookId === bookId), [catalog, bookId]);
  const units = subject?.units ?? [];
  const unit = units.find((u) => u.unitId === unitId);

  function selectSubject(next: string) {
    setBookId(next);
    setUnitId("");
  }

  async function beginCheckout() {
    if (!bookId || !unitId) {
      toast.error(t("diag.toast.chooseFirst", "Choose a subject and a chapter group first."));
      return;
    }
    if (!activeStudentId) {
      toast.error(t("diag.toast.chooseStudent", "Add or select a student profile first."));
      return;
    }
    setPending(true);
    try {
      // Persist the selection before checkout opens so a dropped payment can
      // be resumed with one tap.
      try {
        localStorage.setItem(SELECTION_KEY, JSON.stringify({ bookId, unitId }));
      } catch {
        /* storage unavailable — non-fatal */
      }
      const order = await startFn({ data: { bookId, unitId, learnerId: activeStudentId } });
      await navigate({ to: "/diagnostic/checkout/$orderRef", params: { orderRef: order.orderRef } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("diag.toast.startFailed", "Could not start checkout."));
      setPending(false);
    }
  }

  const cta = (
    <Button
      size="lg"
      className="w-full sm:w-auto"
      onClick={beginCheckout}
      disabled={pending || !unitId || !activeStudentId}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {t("diag.cta", `Start the diagnostic — ${formatInr(PRICING.diagnosticPaise)}`, {
        price: formatInr(PRICING.diagnosticPaise),
      })}
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <DiagnosticShell footerNote="CBSE Class 10 · Mathematics & Science">
      <section className="space-y-4">
        <Badge variant="secondary">
          {t("diag.badge", `CBSE Class 10 · one-time ${formatInr(PRICING.diagnosticPaise)}`, {
            price: formatInr(PRICING.diagnosticPaise),
          })}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("diag.hero.title", "Find out exactly where your child is losing marks.")}
        </h1>
        <p className="text-base text-muted-foreground">
          {t(
            "diag.hero.lede",
            "A curriculum diagnostic of up to 20 questions, mapped to the CBSE learning outcomes in the chapter group you pick. You get the outcome-level report in the same session.",
          )}
        </p>
      </section>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">{t("diag.choose.title", "Choose what to diagnose")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ParentAuthGate next="/diagnostic">
          {query.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : query.isError ? (
            <QueryError
              title={t("diag.loading.error", "Subjects could not be loaded")}
              error={query.error}
              onRetry={() => void query.refetch()}
            />
          ) : catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("diag.empty", "No Class 10 subject is on sale right now. Please check back shortly.")}
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="diag-subject">{t("diag.field.subject", "Board & subject")}</Label>
                  <Select value={bookId} onValueChange={selectSubject}>
                    <SelectTrigger id="diag-subject">
                      <SelectValue placeholder={t("diag.field.subject.placeholder", "Select subject")} />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.map((c) => (
                        <SelectItem key={c.bookId} value={c.bookId}>
                          {t("diag.subject.option", `${c.board} Class ${c.grade} · ${c.subject}`, {
                            board: c.board,
                            grade: c.grade,
                            subject: c.subject,
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="diag-unit">{t("diag.field.unit", "Chapter group")}</Label>
                  <Select value={unitId} onValueChange={setUnitId} disabled={!bookId}>
                    <SelectTrigger id="diag-unit">
                      <SelectValue
                        placeholder={
                          bookId
                            ? t("diag.field.unit.placeholder", "Select chapter group")
                            : t("diag.field.unit.placeholderLocked", "Pick a subject first")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.unitId} value={u.unitId}>
                          {t("diag.unit.option", `${u.title} · ${u.outcomes} outcomes`, {
                            title: u.title,
                            n: u.outcomes,
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {unit ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "diag.unit.summary",
                    `${unit.questionCount} questions drawn across ${unit.outcomes} learning outcomes, allocated by board weight. Price is ${formatInr(PRICING.diagnosticPaise)} whatever you choose.`,
                    { n: unit.questionCount, outcomes: unit.outcomes, price: formatInr(PRICING.diagnosticPaise) },
                  )}
                </p>
              ) : null}
              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{t("diag.student.title", "Who is this for?")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "diag.student.lede",
                      "The diagnostic, the report and the plan are stored against this student profile in your account.",
                    )}
                  </p>
                </div>

                {account.isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : students.length > 0 ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="diag-student">{t("diag.field.student", "Student")}</Label>
                    <Select value={activeStudentId} onValueChange={setLearnerId}>
                      <SelectTrigger id="diag-student">
                        <SelectValue placeholder={t("diag.field.student.placeholder", "Select student")} />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((st) => (
                          <SelectItem key={st.id} value={st.id}>
                            {`${st.fullName} · ${st.board} Class ${st.grade}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("diag.student.none", "Add your child's profile to continue — it takes one line.")}
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_1fr_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-student-name">{t("diag.student.name", "Student name")}</Label>
                    <Input
                      id="new-student-name"
                      value={newStudent.fullName}
                      onChange={(e) => setNewStudent((v) => ({ ...v, fullName: e.target.value }))}
                      placeholder="Aarav Sharma"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-student-class">{t("diag.student.class", "Class")}</Label>
                    <Select
                      value={newStudent.grade}
                      onValueChange={(v) => setNewStudent((s2) => ({ ...s2, grade: v }))}
                    >
                      <SelectTrigger id="new-student-class">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSES.map((c) => (
                          <SelectItem key={c} value={String(c)}>{`Class ${c}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-student-board">{t("diag.student.board", "Board")}</Label>
                    <Select
                      value={newStudent.board}
                      onValueChange={(v) => setNewStudent((s2) => ({ ...s2, board: v }))}
                    >
                      <SelectTrigger id="new-student-board">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOARDS.map((b) => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" onClick={addStudent} disabled={addingStudent}>
                      {addingStudent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t("diag.student.add", "Add student")}
                    </Button>
                  </div>
                </div>
              </div>

              {cta}
            </>
          )}
          </ParentAuthGate>
        </CardContent>
      </Card>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("diag.get.title", `What you get for ${formatInr(PRICING.diagnosticPaise)}`, {
            price: formatInr(PRICING.diagnosticPaise),
          })}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {WHAT_YOU_GET.map((item, i) => (
            <Card key={item.title}>
              <CardContent className="flex gap-3 pt-6">
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t(`diag.get.${i}.title`, item.title)}</p>
                  <p className="text-sm text-muted-foreground">{t(`diag.get.${i}.detail`, item.detail)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("diag.why.title", "Why this is not a quiz")}
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            {t(
              "diag.why.0",
              "Every question is mapped to a named CBSE learning outcome in your child's chapter group — not to a loose topic label.",
            )}
          </li>
          <li>
            {t(
              "diag.why.1",
              "Scoring happens on our servers against those outcomes, so the report says which outcome is weak, not just which questions were wrong.",
            )}
          </li>
          <li>
            {t(
              "diag.why.2",
              "Reassessments later use fresh items the diagnostic never showed, so improvement cannot be faked by repetition.",
            )}
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight">{formatInr(PRICING.diagnosticPaise)}</p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "diag.price.note",
                  "One-time. No auto-renew, no card stored by EduOS. Full refund within 7 days if the diagnostic was never submitted.",
                )}
              </p>
            </div>
            {cta}
          </CardContent>
        </Card>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> {t("diag.trust.secure", "Secure checkout")}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> {t("diag.trust.methods", "UPI · cards · netbanking")}
          </span>
          <span>{t("diag.trust.noCalls", "No marketing calls")}</span>
          <span>{t("diag.trust.india", "Data stays in India")}</span>
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("diag.faq.title", "Questions parents ask")}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm">{t(`diag.faq.${i}.q`, f.q)}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {t(`diag.faq.${i}.a`, f.a, {
                  days: PRICING.creditWindowDays,
                  plan: formatInr(PRICING.planPaise),
                  discounted: formatInr(PRICING.planPaise - PRICING.creditPaise),
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="pt-2">{cta}</div>
      </section>
    </DiagnosticShell>
  );
}
