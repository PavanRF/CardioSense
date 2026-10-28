import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileWarning,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  UploadCloud,
} from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { errorMessage } from "@/components/feature-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tooltipStyle } from "@/lib/chart";
import { MAX_BATCH_ROWS, MAX_FILE_BYTES, toCsv, validateBatch, type BatchParse, type RowError } from "@/lib/csv";
import { getPatient, rowToInput } from "@/lib/dataset";
import { FEATURES } from "@/lib/features";
import { useI18n } from "@/lib/i18n";
import { BATCH_CHUNK, scoreBatch } from "@/lib/predict.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/batch")({
  head: () => ({
    meta: [
      { title: "Bulk CSV Prediction — CardioSense" },
      { name: "description", content: "Validate and score a CSV of heart disease dataset records with row-level error reporting." },
      { property: "og:title", content: "Bulk CSV Prediction — CardioSense" },
      { property: "og:description", content: "Batch screening with per-row validation, probability distribution and scored CSV export." },
    ],
  }),
  component: BatchPage,
});

type Parsed = Extract<BatchParse, { ok: true }>;
type Scored = { line: number; original: string[]; probability: number; predictedClass: 0 | 1 };
type Phase =
  | { kind: "idle" }
  | { kind: "fatal"; message: string }
  | { kind: "parsed" }
  | { kind: "scoring"; done: number }
  | { kind: "error"; message: string }
  | { kind: "done" };

const PAGE = 15;

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function BatchPage() {
  const { t, fmtNum, fmtPct } = useI18n();
  const reduce = useReducedMotion();
  const score = useServerFn(scoreBatch);
  const inputRef = useRef<HTMLInputElement>(null);

  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [scored, setScored] = useState<Scored[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"line" | "desc" | "asc">("line");
  const [page, setPage] = useState(0);

  const rowErrorText = (e: RowError) => t("batch.rowError", { line: e.line, column: e.column, message: errorMessage(t, e.error) });

  const reset = () => {
    setParsed(null);
    setScored([]);
    setFileName(null);
    setPhase({ kind: "idle" });
    setQuery("");
    setPage(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) return setPhase({ kind: "fatal", message: t("batch.err.type") });
    if (file.size > MAX_FILE_BYTES) return setPhase({ kind: "fatal", message: t("batch.err.size") });
    let text: string;
    try {
      text = await file.text();
    } catch {
      return setPhase({ kind: "fatal", message: t("batch.err.read") });
    }
    const res = validateBatch(text);
    if (!res.ok) {
      const message =
        res.reason === "empty"
          ? t("batch.err.empty")
          : res.reason === "missingColumns"
            ? t("batch.err.missing", { cols: res.missing.join(", ") })
            : t("batch.err.tooMany", { max: fmtNum(res.max) });
      return setPhase({ kind: "fatal", message });
    }
    setParsed(res);
    setPhase({ kind: "parsed" });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  };

  const run = async () => {
    if (!parsed || phase.kind === "scoring") return;
    const rows = parsed.valid;
    const out: Scored[] = [];
    setPhase({ kind: "scoring", done: 0 });
    try {
      for (let i = 0; i < rows.length; i += BATCH_CHUNK) {
        const chunk = rows.slice(i, i + BATCH_CHUNK);
        const res = await score({ data: { rows: chunk.map((r) => r.input) } });
        res.results.forEach((r, k) => {
          const src = chunk[k];
          if (src) out.push({ line: src.line, original: src.original, probability: r.probability, predictedClass: r.predictedClass });
        });
        setPhase({ kind: "scoring", done: Math.min(rows.length, i + chunk.length) });
      }
      setScored(out);
      setPhase({ kind: "done" });
      toast.success(t("batch.done", { n: fmtNum(out.length) }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setPhase({ kind: "error", message: /unauthori[sz]ed/i.test(msg) ? t("batch.sessionExpired") : msg.length < 200 ? msg : "" });
    }
  };

  const downloadTemplate = () => {
    const rows = [1, 2, 3].map((id) => {
      const p = getPatient(id);
      const input = p ? rowToInput(p) : null;
      return FEATURES.map((f) => (input ? input[f] : ""));
    });
    download("cardiosense_batch_template.csv", toCsv([[...FEATURES], ...rows]));
  };

  const downloadErrors = () => {
    if (!parsed) return;
    download(
      "cardiosense_validation_errors.csv",
      toCsv([["row", "column", "value", "message"], ...parsed.errors.map((e) => [e.line, e.column, e.value, errorMessage(t, e.error)])]),
    );
  };

  const downloadScored = () => {
    if (!parsed) return;
    download(
      "cardiosense_scored.csv",
      toCsv([
        [...parsed.headers, "predicted_target_class", "estimated_probability_target_1"],
        ...scored.map((s) => [...s.original, s.predictedClass, s.probability.toFixed(4)]),
      ]),
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? scored.filter((s) => String(s.line) === q || s.original.some((c) => c.toLowerCase().includes(q))) : scored;
    const sorted = [...list];
    if (sort === "desc") sorted.sort((a, b) => b.probability - a.probability);
    if (sort === "asc") sorted.sort((a, b) => a.probability - b.probability);
    return sorted;
  }, [scored, query, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const pageRows = filtered.slice(current * PAGE, current * PAGE + PAGE);

  const hist = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 10}–${i * 10 + 10}%`, count: 0 }));
    for (const s of scored) {
      const b = bins[Math.min(9, Math.floor(s.probability * 10))];
      if (b) b.count++;
    }
    return bins;
  }, [scored]);

  const class1 = scored.filter((s) => s.predictedClass === 1).length;
  const class0 = scored.length - class1;
  const featureIdx = parsed ? FEATURES.map((f) => parsed.headers.findIndex((h) => h.toLowerCase() === f)) : [];
  const busy = phase.kind === "scoring";
  const totalValid = parsed?.valid.length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow={t("batch.eyebrow")}
        title={t("batch.title")}
        subtitle={t("batch.subtitle")}
        actions={
          <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> {t("batch.template")}
          </Button>
        }
      />

      {(phase.kind === "idle" || phase.kind === "fatal") && (
        <>
          <motion.label
            htmlFor="batch-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            animate={{ scale: drag && !reduce ? 1.01 : 1 }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card px-6 py-14 text-center transition-colors",
              drag ? "border-primary bg-accent/60" : "border-border hover:border-primary/50",
            )}
          >
            <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl transition-colors", drag ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground")}>
              <UploadCloud className="h-7 w-7" />
            </span>
            <span className="mt-4 font-display text-lg font-semibold">{t("batch.drop")}</span>
            <span className="mt-1 text-sm text-muted-foreground">
              {t("batch.or")} <span className="font-medium text-primary underline-offset-2 hover:underline">{t("batch.choose")}</span>
            </span>
            <span className="mt-3 text-xs text-muted-foreground">{t("batch.limits", { max: fmtNum(MAX_BATCH_ROWS) })}</span>
            <input
              ref={inputRef}
              id="batch-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </motion.label>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> {t("batch.privacy")}
          </p>
          <AnimatePresence>
            {phase.kind === "fatal" && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <div className="text-sm font-semibold text-destructive">{fileName}</div>
                  <p className="text-sm text-foreground/90">{phase.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {parsed && phase.kind !== "idle" && phase.kind !== "fatal" && (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{fileName}</div>
                <div className="text-xs text-muted-foreground">
                  {t("batch.rowsFound")}: {fmtNum(parsed.totalRows)} · {t("batch.validRows")}: <span className="text-success">{fmtNum(totalValid)}</span> · {t("batch.invalidRows")}:{" "}
                  <span className={parsed.invalidLines.length ? "text-destructive" : ""}>{fmtNum(parsed.invalidLines.length)}</span>
                  {parsed.emptyRows > 0 && <> · {t("batch.emptySkipped", { n: parsed.emptyRows })}</>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                {t("batch.reset")}
              </Button>
            </div>
            {parsed.ignoredColumns.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{t("batch.ignored", { cols: parsed.ignoredColumns.join(", ") })}</p>}

            {parsed.errors.length > 0 && (
              <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-warning" /> {t("batch.issues")}
                  </h3>
                  <Button size="sm" variant="outline" className="gap-2" onClick={downloadErrors}>
                    <Download className="h-3.5 w-3.5" /> {t("batch.downloadErrors")}
                  </Button>
                </div>
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  {parsed.errors.slice(0, 8).map((e, i) => (
                    <li key={i}>{rowErrorText(e)}</li>
                  ))}
                </ul>
                {parsed.errors.length > 8 && <p className="mt-1 text-xs text-muted-foreground">{t("batch.moreIssues", { n: parsed.errors.length - 8 })}</p>}
              </div>
            )}

            {phase.kind === "parsed" && (
              <>
                <h3 className="mb-2 mt-5 text-sm font-semibold">{t("batch.preview", { n: Math.min(5, totalValid) })}</h3>
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t("batch.col.row")}</th>
                        {FEATURES.map((f) => (
                          <th key={f} className="px-3 py-2 font-mono font-medium">
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.valid.slice(0, 5).map((r) => (
                        <tr key={r.line} className="border-t">
                          <td className="px-3 py-2 font-mono text-muted-foreground">{r.line}</td>
                          {FEATURES.map((f) => (
                            <td key={f} className="px-3 py-2 font-mono tabular">
                              {r.input[f]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button onClick={() => void run()} disabled={totalValid === 0} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" /> {t("batch.score", { n: fmtNum(totalValid) })}
                  </Button>
                  {totalValid === 0 && <span className="text-sm text-destructive">{t("batch.noValid")}</span>}
                </div>
              </>
            )}

            {phase.kind === "scoring" && (
              <div className="mt-5" aria-live="polite">
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {t("batch.scoring", { done: fmtNum(phase.done), total: fmtNum(totalValid) })}
                </div>
                <Progress value={totalValid ? (phase.done / totalValid) * 100 : 0} />
              </div>
            )}

            {phase.kind === "error" && (
              <div role="alert" className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" /> {t("batch.errorTitle")}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t("batch.errorBody", { message: phase.message })}</p>
                <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => void run()}>
                  <RefreshCw className="h-3.5 w-3.5" /> {t("batch.retry")}
                </Button>
              </div>
            )}
          </section>

          {phase.kind === "done" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { k: "batch.kpi.total", v: parsed.totalRows, c: "" },
                  { k: "batch.kpi.processed", v: scored.length, c: "text-success" },
                  { k: "batch.kpi.class1", v: class1, c: "text-positive" },
                  { k: "batch.kpi.class0", v: class0, c: "text-negative" },
                  { k: "batch.kpi.invalid", v: parsed.invalidLines.length, c: parsed.invalidLines.length ? "text-destructive" : "" },
                ].map((kpi, i) => (
                  <motion.div
                    key={kpi.k}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border bg-card p-4 shadow-card"
                  >
                    <div className="text-sm text-muted-foreground">{t(kpi.k)}</div>
                    <div className={cn("mt-2 font-mono text-3xl font-semibold tabular", kpi.c)}>{fmtNum(kpi.v)}</div>
                  </motion.div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <section className="rounded-2xl border bg-card p-5 shadow-card lg:col-span-2">
                  <h2 className="mb-4 font-display text-base font-semibold">{t("batch.hist")}</h2>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hist} margin={{ left: -16, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="bin" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, t("legend.patients")]} cursor={{ fill: "var(--color-muted)" }} />
                        <Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="flex flex-col rounded-2xl border bg-card p-5 shadow-card">
                  <h2 className="font-display text-base font-semibold">{t("batch.dist")}</h2>
                  <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-muted">
                    <motion.div className="bg-negative" initial={false} animate={{ width: `${scored.length ? (class0 / scored.length) * 100 : 0}%` }} />
                    <motion.div className="bg-positive" initial={false} animate={{ width: `${scored.length ? (class1 / scored.length) * 100 : 0}%` }} />
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-negative">{t("result.class0")}</dt>
                      <dd className="font-mono tabular">{scored.length ? fmtPct(class0 / scored.length) : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-positive">{t("result.class1")}</dt>
                      <dd className="font-mono tabular">{scored.length ? fmtPct(class1 / scored.length) : "—"}</dd>
                    </div>
                  </dl>
                  <p className="mt-auto pt-4 text-xs leading-relaxed text-muted-foreground">{t("disclaimer.predict")}</p>
                </section>
              </div>

              <section className="rounded-2xl border bg-card shadow-card">
                <div className="flex flex-wrap items-center gap-3 border-b p-4">
                  <h2 className="mr-auto font-display text-base font-semibold">{t("batch.results")}</h2>
                  <div className="relative w-full sm:w-56">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(0);
                      }}
                      placeholder={t("batch.search")}
                      className="pl-9"
                      aria-label={t("batch.search")}
                    />
                  </div>
                  <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                    <SelectTrigger className="w-48" aria-label={t("batch.sort")}>
                      <ArrowDownUp className="h-3.5 w-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">{t("batch.sort.line")}</SelectItem>
                      <SelectItem value="desc">{t("batch.sort.probDesc")}</SelectItem>
                      <SelectItem value="asc">{t("batch.sort.probAsc")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="gap-2" onClick={downloadScored}>
                    <Download className="h-4 w-4" /> {t("batch.downloadScored")}
                  </Button>
                  {parsed.errors.length > 0 && (
                    <Button variant="outline" className="gap-2" onClick={downloadErrors}>
                      <Download className="h-4 w-4" /> {t("batch.downloadErrors")}
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t("batch.col.row")}</th>
                        {FEATURES.map((f) => (
                          <th key={f} className="px-3 py-3 font-mono font-medium">
                            {f}
                          </th>
                        ))}
                        <th className="whitespace-nowrap px-3 py-3 font-mono font-medium">{t("batch.col.class")}</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-mono font-medium">{t("batch.col.prob")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((s) => (
                        <tr key={s.line} className="border-t transition-colors hover:bg-muted/40">
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.line}</td>
                          {featureIdx.map((idx, k) => (
                            <td key={k} className="px-3 py-2.5 font-mono text-xs tabular">
                              {s.original[idx]}
                            </td>
                          ))}
                          <td className="px-3 py-2.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", s.predictedClass === 1 ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative")}>
                              {s.predictedClass}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular">{s.probability.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pageRows.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">{t("dataset.empty")}</p>}
                </div>
                <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                  <span>
                    {filtered.length > 0 && t("dataset.showing", { from: current * PAGE + 1, to: current * PAGE + pageRows.length, total: fmtNum(filtered.length) })}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={t("dataset.prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label={t("dataset.next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </>
  );
}
