import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RotateCcw, Search, UserRound, HeartPulse, Activity } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell";
import { FeatureField } from "@/components/feature-field";
import { ResultPanel, displayValue, type Verification } from "@/components/result-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPatient, rowToInput, SAMPLE_HIGH_ID, SAMPLE_LOW_ID } from "@/lib/dataset";
import { modelConfidence } from "@/lib/explain";
import { DEFAULT_INPUT, FEATURE_GROUPS, FEATURES, type FeatureName } from "@/lib/features";
import { useI18n } from "@/lib/i18n";
import { MODEL_INFO, score } from "@/lib/model";
import { verifyPrediction } from "@/lib/predict.functions";
import { toFormValues, validateForm, type FormValues } from "@/lib/validation";

type Search = { patient?: number };

export const Route = createFileRoute("/_authenticated/predict")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const n = Number(s["patient"]);
    return Number.isInteger(n) && n >= 1 && n <= 303 ? { patient: n } : {};
  },
  head: () => ({
    meta: [
      { title: "Live Prediction — CardioSense" },
      { name: "description", content: "Score a heart disease dataset record in real time with a model trained on the UCI Cleveland data." },
      { property: "og:title", content: "Live Prediction — CardioSense" },
      { property: "og:description", content: "Real-time heart disease model output with plain-language explanations and feature impact." },
    ],
  }),
  component: PredictPage,
});

const GROUP_ICONS = [UserRound, HeartPulse, Activity];

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function PredictPage() {
  const { t, fmtPct } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/predict" });
  const verify = useServerFn(verifyPrediction);

  const [values, setValues] = useState<FormValues>(() => {
    const row = search.patient ? getPatient(search.patient) : undefined;
    return toFormValues(row ? rowToInput(row) : DEFAULT_INPUT);
  });
  const [patientId, setPatientId] = useState<number | undefined>(search.patient);
  const [lookup, setLookup] = useState("");
  const [lookupError, setLookupError] = useState(false);
  const [verification, setVerification] = useState<Verification>({ status: "idle" });

  // React to ?patient= changes (e.g. arriving from the dataset explorer).
  useEffect(() => {
    if (!search.patient || search.patient === patientId) return;
    const row = getPatient(search.patient);
    if (row) {
      setValues(toFormValues(rowToInput(row)));
      setPatientId(row.id);
    }
  }, [search.patient, patientId]);

  const { errors, input } = useMemo(() => validateForm(values), [values]);
  const result = useMemo(() => (input ? score(input) : null), [input]);
  const inputKey = useMemo(() => (input ? FEATURES.map((f) => String(input[f])).join("|") : ""), [input]);
  const patient = patientId ? getPatient(patientId) : undefined;
  const patientMatches = patient && input && FEATURES.every((f) => rowToInput(patient)[f] === input[f]);

  const mutation = useMutation({
    mutationFn: (data: NonNullable<typeof input>) => verify({ data }),
    onMutate: () => setVerification({ status: "pending" }),
    onSuccess: (res, data) => {
      setVerification({ status: "success", ...res, key: FEATURES.map((f) => String(data[f])).join("|") });
      toast.success(t("result.verifiedToast"));
    },
    onError: (err) => {
      const message = err instanceof Error && err.message.length < 200 ? err.message : "";
      setVerification({ status: "error", message });
    },
  });

  const setField = (name: FeatureName, v: string) => setValues((prev) => ({ ...prev, [name]: v }));

  const loadPatient = (id: number) => {
    const row = getPatient(id);
    if (!row) {
      setLookupError(true);
      return;
    }
    setLookupError(false);
    setValues(toFormValues(rowToInput(row)));
    setPatientId(id);
    setVerification({ status: "idle" });
    void navigate({ search: { patient: id }, replace: true });
    toast(t("predict.loaded", { id }));
  };

  const onLookup = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(lookup);
    if (!Number.isInteger(n)) return setLookupError(true);
    loadPatient(n);
  };

  const reset = () => {
    setValues(toFormValues(DEFAULT_INPUT));
    setPatientId(undefined);
    setVerification({ status: "idle" });
    setLookup("");
    setLookupError(false);
    void navigate({ search: {}, replace: true });
  };

  const onVerify = () => {
    if (!input || mutation.isPending) return; // prevents duplicate submissions
    mutation.mutate(input);
  };

  const download = () => {
    if (verification.status !== "success" || !input) return;
    const conf = modelConfidence(verification.probability);
    const lines: (string | number)[][] = [
      ["section", "field", "code", "value"],
      ...FEATURES.map((f) => ["input", t(`f.${f}.label`), f, `${input[f]} (${displayValue(t, f, input[f])})`]),
      ["output", t("result.prob"), "estimated_probability_target_1", verification.probability.toFixed(4)],
      ["output", t("result.class"), "predicted_target_class", verification.predictedClass],
      ["output", t("confidence.title"), "model_confidence", conf.confidence.toFixed(4)],
      ["output", t("risk.title"), "clinical_risk", t("risk.value")],
      ["meta", "model", "", `${MODEL_INFO.name} (${MODEL_INFO.source})`],
      ["meta", "verified_at", "", verification.verifiedAt],
      ...(patientMatches && patient ? [["meta", "dataset_patient", "", `#${patient.id}`]] : []),
      ["meta", t("disclaimer.title"), "", t("disclaimer.full")],
    ];
    const csv = "\uFEFF" + lines.map((l) => l.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t("result.reportFile")}_${verification.verifiedAt.replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const invalidCount = Object.keys(errors).length;

  return (
    <>
      <PageHeader
        eyebrow={t("predict.eyebrow")}
        title={t("predict.title")}
        subtitle={t("predict.subtitle")}
        actions={
          <Button variant="ghost" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" /> {t("predict.reset")}
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-card md:flex-row md:items-center">
        <Select
          value=""
          onValueChange={(v) => (v === "median" ? reset() : loadPatient(Number(v)))}
        >
          <SelectTrigger className="h-10 md:w-80" aria-label={t("predict.samples")}>
            <SelectValue placeholder={t("predict.samples")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(SAMPLE_LOW_ID)}>{t("predict.sample.low", { id: SAMPLE_LOW_ID })}</SelectItem>
            <SelectItem value={String(SAMPLE_HIGH_ID)}>{t("predict.sample.high", { id: SAMPLE_HIGH_ID })}</SelectItem>
            <SelectItem value="median">{t("predict.sample.median")}</SelectItem>
          </SelectContent>
        </Select>
        <form onSubmit={onLookup} className="flex flex-1 items-start gap-2">
          <div className="flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={lookup}
                onChange={(e) => {
                  setLookup(e.target.value);
                  setLookupError(false);
                }}
                inputMode="numeric"
                placeholder={`${t("predict.patientId")} ${t("predict.patientPlaceholder")}`}
                className="h-10 pl-9"
                aria-invalid={lookupError}
                aria-label={t("predict.patientId")}
              />
            </div>
            {lookupError && <p className="mt-1 text-xs text-destructive">{t("validation.patientNotFound")}</p>}
          </div>
          <Button type="submit" variant="secondary" className="h-10">
            {t("predict.loadPatient")}
          </Button>
        </form>
        {patientMatches && patient && (
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">#{patient.id}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <div className="space-y-6">
          {FEATURE_GROUPS.map((g, i) => {
            const Icon = GROUP_ICONS[i] ?? Activity;
            return (
              <section key={g.key} className="rounded-2xl border bg-card p-5 shadow-card transition-shadow hover:shadow-lift sm:p-6">
                <h2 className="mb-5 flex items-center gap-2 font-display text-base font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  {t(g.key)}
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  {g.features.map((f) => (
                    <FeatureField key={f} name={f} value={values[f]} error={errors[f]} onChange={(v) => setField(f, v)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div id="model-output" className="scroll-mt-20 lg:sticky lg:top-24 lg:self-start">
          <ResultPanel
            result={result}
            input={input}
            invalidCount={invalidCount}
            verification={verification}
            inputKey={inputKey}
            patient={patientMatches ? patient : undefined}
            onVerify={onVerify}
            onDownload={download}
          />
        </div>
      </div>

      {/* Mobile: keep the live estimate visible while editing inputs */}
      <a
        href="#model-output"
        className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-lift backdrop-blur lg:hidden"
      >
        <span className="text-xs text-muted-foreground">{t("result.live")}</span>
        {result ? (
          <span className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold tabular">{fmtPct(result.probability)}</span>
            <span className={result.predictedClass === 1 ? "rounded-full bg-positive/15 px-2 py-0.5 text-xs font-semibold text-positive" : "rounded-full bg-negative/15 px-2 py-0.5 text-xs font-semibold text-negative"}>
              {t("result.class")} {result.predictedClass}
            </span>
          </span>
        ) : (
          <span className="text-xs font-medium text-destructive">{t("result.invalidTitle")}</span>
        )}
      </a>
      <div className="h-16 lg:hidden" />
    </>
  );
}
