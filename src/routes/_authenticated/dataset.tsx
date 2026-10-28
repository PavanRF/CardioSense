import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVALUATION, SCORED } from "@/lib/dataset";
import { FEATURE_SPECS, FEATURES } from "@/lib/features";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dataset")({
  head: () => ({
    meta: [
      { title: "Dataset Explorer — CardioSense" },
      { name: "description", content: "Browse and filter the 303 real UCI Cleveland heart disease records and load any case into the live predictor." },
      { property: "og:title", content: "Dataset Explorer — CardioSense" },
      { property: "og:description", content: "Real anonymized research records, feature codebook and class distribution." },
    ],
  }),
  component: DatasetPage,
});

const PAGE = 12;
const AGE_BRACKETS = [
  { key: "all", test: () => true },
  { key: "<45", test: (a: number) => a < 45 },
  { key: "45–54", test: (a: number) => a >= 45 && a < 55 },
  { key: "55–64", test: (a: number) => a >= 55 && a < 65 },
  { key: "65+", test: (a: number) => a >= 65 },
];
const COLUMNS = ["age", "sex", "cp", "trestbps", "chol", "thalach", "exang", "oldpeak", "ca", "thal"] as const;

function Chips<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="inline-flex w-fit gap-1 rounded-lg bg-muted p-1">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={o.v === value}
            onClick={() => onChange(o.v)}
            className={cn("whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all", o.v === value ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DatasetPage() {
  const { t, fmtPct, fmtNum } = useI18n();
  const [q, setQ] = useState("");
  const [sex, setSex] = useState<"all" | "0" | "1">("all");
  const [outcome, setOutcome] = useState<"all" | "0" | "1">("all");
  const [age, setAge] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const bracket = AGE_BRACKETS.find((b) => b.key === age) ?? AGE_BRACKETS[0];
    return SCORED.filter(
      (r) =>
        (q.trim() === "" || String(r.id).startsWith(q.trim())) &&
        (sex === "all" || String(r.sex) === sex) &&
        (outcome === "all" || String(r.target) === outcome) &&
        (bracket?.test(r.age ?? 0) ?? true),
    );
  }, [q, sex, outcome, age]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  const male = SCORED.filter((r) => r.sex === 1).length;
  const ds = EVALUATION.dataset;

  const cell = (name: (typeof COLUMNS)[number], v: number | null) => {
    if (v == null) return <span className="text-warning">?</span>;
    if (FEATURE_SPECS[name].kind === "code" && name !== "ca") return <span title={t(`opt.${name}.${v}`)}>{t(`opt.${name}.${v}`)}</span>;
    return v;
  };

  return (
    <>
      <PageHeader eyebrow={t("dataset.eyebrow")} title={t("dataset.title")} subtitle={t("dataset.subtitle")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="text-xs text-muted-foreground">{t("dataset.filter.outcome")}</div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full">
            <div className="bg-negative" style={{ width: `${(ds.negative / ds.rows) * 100}%` }} />
            <div className="bg-positive" style={{ width: `${(ds.positive / ds.rows) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-negative">{t("legend.absent")} · {ds.negative}</span>
            <span className="text-positive">{t("legend.present")} · {ds.positive}</span>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="text-xs text-muted-foreground">{t("dataset.sexRatio")}</div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full">
            <div className="bg-chart-3" style={{ width: `${(male / ds.rows) * 100}%` }} />
            <div className="bg-chart-5" style={{ width: `${((ds.rows - male) / ds.rows) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{t("opt.sex.1")} · {male} ({fmtPct(male / ds.rows, 0)})</span>
            <span>{t("opt.sex.0")} · {ds.rows - male}</span>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-card">
          <div className="text-xs text-muted-foreground">{t("dataset.missingNote")}</div>
          <div className="mt-2 font-mono text-sm tabular">
            {Object.entries(ds.missing).map(([k, v]) => (
              <span key={k} className="mr-3">
                {k}: <strong>{v}</strong>
              </span>
            ))}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {ds.rows} × {ds.features}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border bg-card shadow-card">
        <div className="flex flex-wrap items-end gap-4 border-b p-4">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => resetPage(setQ)(e.target.value.replace(/\D/g, ""))} placeholder={t("dataset.search")} className="pl-9" inputMode="numeric" aria-label={t("dataset.search")} />
          </div>
          <Chips label={t("dataset.filter.sex")} value={sex} onChange={resetPage(setSex)} options={[{ v: "all", label: t("dataset.all") }, { v: "0", label: t("opt.sex.0") }, { v: "1", label: t("opt.sex.1") }]} />
          <Chips label={t("dataset.filter.outcome")} value={outcome} onChange={resetPage(setOutcome)} options={[{ v: "all", label: t("dataset.all") }, { v: "0", label: t("legend.absent") }, { v: "1", label: t("legend.present") }]} />
          <Chips label={t("dataset.filter.age")} value={age} onChange={resetPage(setAge)} options={AGE_BRACKETS.map((b) => ({ v: b.key, label: b.key === "all" ? t("dataset.all") : b.key }))} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3" />
                <th className="px-3 py-3 font-medium">#</th>
                {COLUMNS.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-3 font-medium" title={t(`f.${c}.label`)}>
                    {t(`f.${c}.label`)}
                  </th>
                ))}
                <th className="px-3 py-3 font-medium">{t("dataset.outcome")}</th>
                <th className="px-3 py-3 text-right font-medium">P(1)</th>
                <th className="px-3 py-3 font-medium">{t("dataset.split")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t transition-colors hover:bg-muted/40">
                  <td className="px-4 py-2.5 ">
                    <Button asChild size="sm" variant="outline" className="h-7">
                      <Link to="/predict" search={{ patient: r.id }}>
                        {t("dataset.load")}
                      </Link>
                    </Button>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                  {COLUMNS.map((c) => (
                    <td key={c} className="max-w-[9rem] truncate whitespace-nowrap px-3 py-2.5 tabular">
                      {cell(c, r[c])}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", r.target === 1 ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative")}>
                      {r.target === 1 ? t("legend.present") : t("legend.absent")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular">{fmtNum(r.probability, 2)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.split === "test" ? t("dataset.test") : t("dataset.train")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">{t("dataset.empty")}</p>}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>
            {filtered.length === 0
              ? t("dataset.empty")
              : t("dataset.showing", { from: current * PAGE + 1, to: current * PAGE + rows.length, total: filtered.length })}
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

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="font-display text-base font-semibold">{t("dataset.codebook")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("dataset.codebookDesc")}</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => {
            const spec = FEATURE_SPECS[f];
            return (
              <div key={f} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t(`f.${f}.label`)}</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{f}</code>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t(`f.${f}.hint`)}</p>
                <div className="mt-2 text-xs">
                  {spec.kind === "numeric" ? (
                    <span className="font-mono tabular">
                      {spec.min}–{spec.max} {t(`f.${f}.unit`) !== `f.${f}.unit` ? t(`f.${f}.unit`) : ""}
                    </span>
                  ) : (
                    <ul className="flex flex-wrap gap-1">
                      {spec.codes.map((c) => (
                        <li key={c} className="rounded-md bg-muted px-1.5 py-0.5">
                          <span className="font-mono text-muted-foreground">{c}</span> {t(`opt.${f}.${c}`)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
