import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, Database, HeartPulse, Sigma, Target, Users } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { EVALUATION, LIVE_RESULT, SCORED } from "@/lib/dataset";
import { useI18n } from "@/lib/i18n";
import { MODEL_INFO } from "@/lib/model";
import { tooltipStyle } from "@/lib/chart";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CardioSense" },
      {
        name: "description",
        content: "Live heart disease prediction dashboard built on the 303-record UCI Cleveland dataset, with real held-out test metrics.",
      },
      { property: "og:title", content: "Dashboard — CardioSense" },
      { property: "og:description", content: "Real-time ML predictions, model performance and dataset explorer in English, Spanish and Hindi." },
    ],
  }),
  component: Overview,
});


function Kpi({ icon: Icon, label, value, sub, i }: { icon: typeof Users; label: string; value: string; sub?: string; i: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.25 }}
      className="rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-mono text-3xl font-semibold tabular">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}

function Overview() {
  const { t, fmtPct, fmtNum } = useI18n();
  const ds = EVALUATION.dataset;

  const probBins = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 10}–${i * 10 + 10}%`, absent: 0, present: 0 }));
    for (const r of SCORED) {
      const b = bins[Math.min(9, Math.floor(r.probability * 10))];
      if (b) b[r.target === 1 ? "present" : "absent"]++;
    }
    return bins;
  }, []);

  const ageBins = useMemo(() => {
    const starts = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];
    const bins = starts.map((s) => ({ bin: `${s}–${s + 4}`, absent: 0, present: 0 }));
    for (const r of SCORED) {
      const idx = Math.min(starts.length - 1, Math.floor(((r.age ?? 0) - 25) / 5));
      const b = bins[idx];
      if (b) b[r.target === 1 ? "present" : "absent"]++;
    }
    return bins;
  }, []);

  const legendFmt = (v: string) => (v === "present" ? t("legend.present") : t("legend.absent"));

  return (
    <>
      <PageHeader
        eyebrow={t("overview.eyebrow")}
        title={t("overview.title")}
        subtitle={t("overview.subtitle")}
        actions={
          <>
            <Button asChild className="gap-2">
              <Link to="/predict">
                <Activity className="h-4 w-4" /> {t("overview.cta.predict")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/dataset">
                <Database className="h-4 w-4" /> {t("overview.cta.dataset")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} icon={Users} label={t("kpi.records")} value={fmtNum(ds.rows)} sub={`${ds.features} features`} />
        <Kpi i={1} icon={HeartPulse} label={t("kpi.positive")} value={fmtNum(ds.positive)} sub={fmtPct(ds.positive / ds.rows)} />
        <Kpi i={2} icon={Target} label={t("kpi.auc")} value={fmtNum(LIVE_RESULT.roc_auc, 3)} sub={t("kpi.testOf", { n: EVALUATION.split.test_rows })} />
        <Kpi i={3} icon={Sigma} label={t("kpi.accuracy")} value={fmtPct(LIVE_RESULT.accuracy)} sub={t("kpi.testOf", { n: EVALUATION.split.test_rows })} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 shadow-card xl:col-span-2">
          <h2 className="font-display text-base font-semibold">{t("overview.probHist")}</h2>
          <p className="mb-4 text-xs text-muted-foreground">{t("overview.probHistDesc")}</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={probBins} margin={{ left: -16, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="bin" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [v, legendFmt(n)]} cursor={{ fill: "var(--color-muted)" }} />
                <Legend formatter={legendFmt} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="absent" stackId="a" fill="var(--color-negative)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="present" stackId="a" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="flex flex-col rounded-2xl bg-sidebar p-6 text-sidebar-foreground shadow-card">
          <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-primary">{t("overview.modelCard")}</div>
          <div className="mt-2 font-display text-2xl font-semibold text-sidebar-accent-foreground">{MODEL_INFO.name}</div>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-sidebar-foreground/70">{t("overview.source")}</dt>
              <dd>
                <a href={ds.url} target="_blank" rel="noreferrer" className="underline decoration-sidebar-primary/50 underline-offset-2 hover:text-sidebar-accent-foreground">
                  {ds.name}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-foreground/70">{t("overview.split")}</dt>
              <dd className="font-mono tabular">
                {EVALUATION.split.train_rows} / {EVALUATION.split.test_rows}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-foreground/70">{t("overview.missing")}</dt>
              <dd className="font-mono tabular">
                {Object.entries(ds.missing)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-sidebar-foreground/70">{t("overview.trainedWith")}</dt>
              <dd>{MODEL_INFO.source}</dd>
            </div>
          </dl>
          <Button asChild variant="secondary" className="mt-auto gap-2 pt-0">
            <Link to="/performance" className="mt-6">
              {t("nav.performance")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 font-display text-base font-semibold">{t("overview.ageDist")}</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageBins} margin={{ left: -16, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="bin" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [v, legendFmt(n)]} cursor={{ fill: "var(--color-muted)" }} />
              <Legend formatter={legendFmt} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="absent" fill="var(--color-negative)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="present" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
