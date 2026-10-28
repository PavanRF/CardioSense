import { createFileRoute } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/app-shell";
import { EVALUATION, LIVE_RESULT, type ModelResult } from "@/lib/dataset";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { tooltipStyle } from "@/lib/chart";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({
    meta: [
      { title: "Model Performance — CardioSense" },
      { name: "description", content: "Held-out test accuracy, precision, recall, F1, ROC-AUC, ROC curves and confusion matrices for four models." },
      { property: "og:title", content: "Model Performance — CardioSense" },
      { property: "og:description", content: "Real evaluation results on the UCI Cleveland heart disease test split." },
    ],
  }),
  component: Performance,
});

const METRICS = ["accuracy", "precision", "recall", "f1", "roc_auc"] as const;
const LINE_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-4)", "var(--color-chart-3)"];

function Performance() {
  const { t, fmtNum, fmtPct } = useI18n();
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<string>(EVALUATION.live_model);
  const model = (EVALUATION.models.find((m) => m.name === selected) ?? LIVE_RESULT) as ModelResult;
  const cm = model.confusion_matrix;
  const n = EVALUATION.split.test_rows;

  // Merge each model's ROC points onto one sorted fpr axis (step interpolation).
  const rocData = (() => {
    const xs = Array.from(new Set(EVALUATION.models.flatMap((m) => m.roc_curve.map((p) => p.fpr)))).sort((a, b) => a - b);
    return xs.map((fpr) => {
      const row: Record<string, number> = { fpr, chance: fpr };
      for (const m of EVALUATION.models) {
        const pts = m.roc_curve.filter((p) => p.fpr <= fpr);
        row[m.name] = pts.length ? Math.max(...pts.map((p) => p.tpr)) : 0;
      }
      return row;
    });
  })();

  const cells = [
    { key: "cm.tn", v: cm.tn, good: true },
    { key: "cm.fp", v: cm.fp, good: false },
    { key: "cm.fn", v: cm.fn, good: false },
    { key: "cm.tp", v: cm.tp, good: true },
  ];

  return (
    <>
      <PageHeader eyebrow={t("performance.eyebrow")} title={t("performance.title")} subtitle={t("performance.subtitle", { n })} />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {EVALUATION.models.map((m) => (
          <button
            key={m.name}
            role="tab"
            aria-selected={m.name === selected}
            onClick={() => setSelected(m.name)}
            className={cn(
              "relative rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              m.name === selected ? "border-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {m.name === selected && (
              <motion.span layoutId="model-tab" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
            )}
            <span className="relative">
              {m.name}
              {m.name === EVALUATION.live_model && <span className="ml-1.5 text-[10px] uppercase opacity-80">· {t("performance.live")}</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {METRICS.map((k, i) => (
          <motion.div
            key={`${selected}-${k}`}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            className="rounded-2xl border bg-card p-4 shadow-card"
          >
            <div className="text-sm text-muted-foreground">{t(`metric.${k}`)}</div>
            <div className="mt-2 font-mono text-2xl font-semibold tabular">{k === "roc_auc" ? fmtNum(model[k], 3) : fmtPct(model[k])}</div>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{t(`metric.${k}.desc`)}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border bg-card p-5 shadow-card lg:col-span-3">
          <h2 className="font-display text-base font-semibold">{t("performance.roc")}</h2>
          <p className="mb-4 text-xs text-muted-foreground">{t("performance.rocDesc")}</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocData} margin={{ left: -10, right: 12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  dataKey="fpr"
                  domain={[0, 1]}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  label={{ value: "FPR", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v: number) => v.toFixed(1)}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  label={{ value: "TPR", angle: -90, position: "insideLeft", offset: 18, fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(3)} labelFormatter={(v: number) => `FPR ${Number(v).toFixed(3)}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="chance" name={t("performance.chance")} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" dot={false} strokeWidth={1} type="linear" />
                {EVALUATION.models.map((m, i) => (
                  <Line
                    key={m.name}
                    dataKey={m.name}
                    type="stepAfter"
                    dot={false}
                    stroke={LINE_COLORS[i]}
                    strokeWidth={m.name === selected ? 3 : 1.5}
                    strokeOpacity={m.name === selected ? 1 : 0.45}
                    isAnimationActive={!reduce}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-card lg:col-span-2">
          <h2 className="font-display text-base font-semibold">{t("performance.cm")}</h2>
          <p className="mb-4 text-xs text-muted-foreground">{t("performance.cmDesc", { model: model.name })}</p>
          <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-center text-xs">
            <span />
            <span className="font-medium text-muted-foreground">{t("performance.predicted")} 0</span>
            <span className="font-medium text-muted-foreground">{t("performance.predicted")} 1</span>
            {[0, 1].map((row) => (
              <div key={row} className="contents">
                <span className="flex items-center pr-1 font-medium text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                  {t("performance.actual")} {row}
                </span>
                {cells.slice(row * 2, row * 2 + 2).map((c) => (
                  <motion.div
                    key={`${selected}-${c.key}`}
                    initial={reduce ? false : { scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className={cn(
                      "flex aspect-[4/3] flex-col items-center justify-center rounded-xl border",
                      c.good ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10",
                    )}
                    style={{ opacity: 0.55 + (c.v / n) * 1.2 }}
                  >
                    <span className={cn("font-mono text-3xl font-semibold tabular", c.good ? "text-success" : "text-destructive")}>{c.v}</span>
                    <span className="mt-1 text-muted-foreground">{t(c.key)}</span>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-card">
        <h2 className="border-b px-5 py-4 font-display text-base font-semibold">{t("performance.comparison")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">{t("performance.model")}</th>
                {METRICS.map((k) => (
                  <th key={k} className="px-4 py-3 text-right font-medium">
                    {t(`metric.${k}`)}
                  </th>
                ))}
                <th className="px-5 py-3 text-right font-medium">{t("performance.cv")}</th>
              </tr>
            </thead>
            <tbody>
              {EVALUATION.models.map((m) => (
                <tr key={m.name} onClick={() => setSelected(m.name)} className={cn("cursor-pointer border-t transition-colors hover:bg-muted/40", m.name === selected && "bg-accent/50")}>
                  <td className="px-5 py-3 font-medium">
                    {m.name}
                    {m.name === EVALUATION.live_model && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">{t("performance.live")}</span>
                    )}
                    {m.name === EVALUATION.best_by_test_roc_auc && (
                      <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-success">{t("performance.best")}</span>
                    )}
                  </td>
                  {METRICS.map((k) => (
                    <td key={k} className="px-4 py-3 text-right font-mono tabular">
                      {fmtNum(m[k], 3)}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right font-mono tabular">
                    {fmtNum(m.cv_roc_auc_mean, 3)} <span className="text-muted-foreground">± {fmtNum(m.cv_roc_auc_std, 3)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="mt-6 flex gap-3 rounded-2xl border border-primary/30 bg-accent/50 p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">{t("performance.limitsTitle")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("performance.limits", { n })}</p>
        </div>
      </aside>
    </>
  );
}
