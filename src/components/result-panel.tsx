import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Gauge,
  Loader2,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { ProbabilityGauge } from "@/components/probability-gauge";
import { Button } from "@/components/ui/button";
import { modelConfidence, topFactors } from "@/lib/explain";
import { FEATURE_SPECS, type FeatureName, type PatientInput } from "@/lib/features";
import { useI18n } from "@/lib/i18n";
import type { ScoreResult } from "@/lib/model";
import type { PatientRow } from "@/lib/dataset";
import { cn } from "@/lib/utils";

export type Verification =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "success"; probability: number; predictedClass: 0 | 1; verifiedAt: string; key: string };

export function displayValue(t: ReturnType<typeof useI18n>["t"], name: FeatureName, v: number) {
  const spec = FEATURE_SPECS[name];
  if (spec.kind === "code") return t(`opt.${name}.${v}`);
  const unitKey = `f.${name}.unit`;
  const unit = t(unitKey);
  return unit === unitKey ? String(v) : `${v} ${unit}`;
}

export function ResultPanel({
  result,
  input,
  invalidCount,
  verification,
  inputKey,
  patient,
  onVerify,
  onDownload,
}: {
  result: ScoreResult | null;
  input: PatientInput | null;
  invalidCount: number;
  verification: Verification;
  inputKey: string;
  patient: PatientRow | undefined;
  onVerify: () => void;
  onDownload: () => void;
}) {
  const { t, fmtPct, locale, fmtNum } = useI18n();
  const pending = verification.status === "pending";
  const verified = verification.status === "success" && verification.key === inputKey;
  const stale = verification.status === "success" && verification.key !== inputKey;
  const conf = result ? modelConfidence(result.probability) : null;
  const factors = result ? topFactors(result) : [];
  const maxAbs = result ? Math.max(...result.contributions.map((c) => Math.abs(c.logit)), 0.5) : 1;

  return (
    <div className="space-y-4">
      {/* Prominent educational-use disclaimer, always visible beside the output */}
      <div role="note" className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <div className="text-sm font-semibold text-foreground">{t("disclaimer.title")}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("disclaimer.predict")}</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6" aria-live="polite">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{t("result.title")}</h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={pending ? "p" : verified ? "v" : stale ? "s" : "l"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                verified ? "bg-success/15 text-success" : stale ? "bg-warning/15 text-warning" : "bg-accent text-accent-foreground",
              )}
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : verified ? (
                <ShieldCheck className="h-3 w-3" />
              ) : (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              )}
              {pending ? t("predict.analyzing") : verified ? t("result.verified") : stale ? t("result.stale") : t("result.live")}
            </motion.span>
          </AnimatePresence>
        </div>

        <p className="mb-1 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("result.prob")}</p>
        <ProbabilityGauge value={result?.probability ?? null} locale={locale} dimmed={!result} />
        <p className="mt-1 text-center text-[11px] text-muted-foreground">{t("result.threshold")}</p>

        {!result ? (
          <div className="mt-5 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-center">
            <div className="text-sm font-semibold text-destructive">{t("result.invalidTitle")}</div>
            <p className="mt-1 text-xs text-muted-foreground">{t("result.invalid", { count: invalidCount })}</p>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-col items-center gap-1 text-center">
              <span className="text-xs text-muted-foreground">{t("result.class")}</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-semibold",
                  result.predictedClass === 1 ? "bg-positive/15 text-positive" : "bg-negative/15 text-negative",
                )}
              >
                {result.predictedClass === 1 ? t("result.class1") : t("result.class0")}
              </span>
              {patient && (
                <span className="mt-1 text-xs text-muted-foreground">
                  {t("result.actual", { id: patient.id })}:{" "}
                  <strong className={patient.target === 1 ? "text-positive" : "text-negative"}>
                    {patient.target === 1 ? t("legend.present") : t("legend.absent")}
                  </strong>
                </span>
              )}
            </div>

            {/* Model confidence vs clinical risk — deliberately different visual treatments */}
            {conf && (
              <div className="mt-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("compare.title")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Gauge className="h-4 w-4 text-primary" />
                      {t("confidence.title")}
                    </div>
                    <div className="mt-2 font-mono text-2xl font-semibold tabular text-primary">{fmtPct(conf.confidence)}</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={false}
                        animate={{ width: `${((conf.confidence - 0.5) / 0.5) * 100}%` }}
                        transition={{ type: "spring", stiffness: 160, damping: 24 }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("confidence.what")}</p>
                  </div>
                  <div
                    className="rounded-xl border-2 border-dashed border-muted-foreground/30 p-4"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, transparent 0 10px, color-mix(in oklab, var(--color-muted) 70%, transparent) 10px 11px)",
                    }}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      {t("risk.title")}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-muted-foreground">{t("risk.value")}</div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("risk.body")}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Plain-language explanation */}
            {conf && (
              <div className="mt-6 rounded-xl bg-muted/60 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  {t("plain.title")}
                </h3>
                <ul className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">
                  <li>{t("plain.score", { p: fmtPct(result.probability), cls: result.predictedClass })}</li>
                  <li>{t("plain.confidence", { c: fmtPct(conf.confidence), level: t(`plain.level.${conf.level}`) })}</li>
                  {factors.length > 0 && input && (
                    <li>
                      {t("plain.factors")}
                      <ul className="mt-1 space-y-1 pl-4">
                        {factors.map((f) => (
                          <li key={f.feature} className="list-disc">
                            <strong>{t(`f.${f.feature}.label`)}</strong> ({displayValue(t, f.feature, input[f.feature])}):{" "}
                            {t(`plain.effect.${f.direction}.${f.strength}`)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                  <li className="text-muted-foreground">{t("plain.meaning")}</li>
                </ul>
              </div>
            )}

            {/* Feature impact chart */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold">{t("result.impact")}</h3>
              <p className="mb-3 text-xs text-muted-foreground">{t("result.impactDesc")}</p>
              <ul className="space-y-1.5">
                {result.contributions.map((c) => {
                  const w = (Math.abs(c.logit) / maxAbs) * 50;
                  const up = c.logit > 0;
                  return (
                    <li key={c.feature} className="grid grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-2 text-xs">
                      <span className="truncate text-muted-foreground">{t(`f.${c.feature}.label`)}</span>
                      <div className="relative h-3.5 rounded bg-muted/70">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                        <motion.span
                          className={cn("absolute inset-y-0 rounded", up ? "left-1/2 bg-positive/80" : "right-1/2 bg-negative/80")}
                          initial={false}
                          animate={{ width: `${w}%` }}
                          transition={{ type: "spring", stiffness: 200, damping: 26 }}
                        />
                      </div>
                      <span className={cn("text-right font-mono tabular", up ? "text-positive" : "text-negative")}>
                        {c.logit > 0 ? "+" : ""}
                        {fmtNum(c.logit, 2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>← {t("result.lowers")}</span>
                <span>{t("result.raises")} →</span>
              </div>
            </div>
          </>
        )}

        <AnimatePresence>
          {verification.status === "error" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              role="alert"
              className="mt-5 overflow-hidden rounded-xl border border-destructive/40 bg-destructive/10 p-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" /> {t("result.errorTitle")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("result.errorBody", { message: verification.message })}</p>
              <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={onVerify}>
                <RefreshCw className="h-3.5 w-3.5" /> {t("result.retry")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {verified && verification.status === "success" && (
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("result.verifiedAt", { time: new Date(verification.verifiedAt).toLocaleString(locale) })}
          </p>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={onVerify} disabled={!result || pending} className="gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {pending ? t("predict.analyzing") : t("predict.analyze")}
          </Button>
          <Button variant="outline" onClick={onDownload} disabled={!verified} className="gap-2">
            <Download className="h-4 w-4" />
            {t("result.download")}
          </Button>
        </div>
      </section>
    </div>
  );
}
