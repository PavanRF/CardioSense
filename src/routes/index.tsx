import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowRight, BarChart3, Database, FileSpreadsheet, Languages, ShieldAlert } from "lucide-react";

import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { EVALUATION, LIVE_RESULT } from "@/lib/dataset";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CardioSense — Heart Disease Prediction on Real Patient Data" },
      {
        name: "description",
        content: "Academic ML prototype: live heart disease predictions, batch CSV screening and real test metrics on the UCI Cleveland dataset.",
      },
      { property: "og:title", content: "CardioSense — Heart Disease Prediction on Real Patient Data" },
      { property: "og:description", content: "Real-time ML predictions, batch screening, model performance and dataset explorer in English, Spanish and Hindi." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Activity, title: "landing.f.predict.title", body: "landing.f.predict.body" },
  { icon: FileSpreadsheet, title: "landing.f.batch.title", body: "landing.f.batch.body" },
  { icon: BarChart3, title: "landing.f.perf.title", body: "landing.f.perf.body" },
  { icon: Database, title: "landing.f.data.title", body: "landing.f.data.body" },
  { icon: Languages, title: "landing.f.lang.title", body: "landing.f.lang.body" },
  { icon: ShieldAlert, title: "landing.f.safety.title", body: "landing.f.safety.body" },
];

function Landing() {
  const { t, fmtPct, fmtNum } = useI18n();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const stats = [
    { label: t("kpi.records"), value: fmtNum(EVALUATION.dataset.rows) },
    { label: t("kpi.auc"), value: fmtNum(LIVE_RESULT.roc_auc, 3) },
    { label: t("kpi.accuracy"), value: fmtPct(LIVE_RESULT.accuracy) },
    { label: t("metric.recall"), value: fmtPct(LIVE_RESULT.recall) },
  ];

  return (
    <PublicShell>
      <section className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
        <svg className="pointer-events-none absolute inset-x-0 bottom-10 h-40 w-full opacity-20" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0 90 H380 L410 40 L450 140 L490 20 L530 110 L560 90 H1200"
            fill="none"
            stroke="var(--color-sidebar-primary)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/60 px-3 py-1 text-xs font-medium">
              <ShieldAlert className="h-3.5 w-3.5 text-sidebar-primary" /> {t("disclaimer.title")}
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-sidebar-accent-foreground sm:text-5xl">{t("landing.title")}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed">{t("landing.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Button asChild size="lg" className="gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  <Link to="/dashboard">
                    {t("landing.openDashboard")} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                    <Link to="/auth" search={{ mode: "signup" }}>
                      {t("auth.createAccount")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-sidebar-border bg-transparent text-sidebar-accent-foreground hover:bg-sidebar-accent">
                    <Link to="/auth">{t("auth.signIn")}</Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto -mt-10 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 rounded-2xl border bg-card p-6 shadow-lift sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 font-mono text-3xl font-semibold tabular">{s.value}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">{t("landing.statsNote", { n: EVALUATION.split.test_rows, model: LIVE_RESULT.name })}</p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold">{t("landing.featuresTitle")}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-4 font-semibold">{t(f.title)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(f.body)}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
