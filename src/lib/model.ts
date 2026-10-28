import modelJson from "@/data/model.json";
import { FEATURES, type FeatureName, type PatientInput } from "@/lib/features";

// Re-implements the fitted scikit-learn pipeline exactly:
// numeric → median impute → standard scale; binary → mode impute; categorical → mode impute → one-hot.
// Parity with sklearn predict_proba is checked in src/test/model.test.ts.

type Model = typeof modelJson;
const model: Model = modelJson;

export type Contribution = { feature: FeatureName; logit: number };
export type ScoreResult = {
  probability: number;
  predictedClass: 0 | 1;
  logit: number;
  contributions: Contribution[];
};

export type PartialPatient = Partial<Record<FeatureName, number | null>>;

function sigmoid(z: number) {
  return 1 / (1 + Math.exp(-z));
}

export function score(input: PartialPatient | PatientInput): ScoreResult {
  let logit = model.intercept;
  const contributions: Contribution[] = [];

  for (const n of model.numeric) {
    const raw = input[n.feature as FeatureName];
    const x = raw == null || Number.isNaN(raw) ? n.median : raw;
    const term = n.coef * ((x - n.mean) / n.scale);
    logit += term;
    // Standardized 0 = training mean, so the term itself is the deviation from a typical patient.
    contributions.push({ feature: n.feature as FeatureName, logit: term });
  }
  for (const b of model.binary) {
    const raw = input[b.feature as FeatureName];
    const x = raw == null || Number.isNaN(raw) ? b.mode : raw;
    logit += b.coef * x;
    contributions.push({ feature: b.feature as FeatureName, logit: b.coef * (x - b.mode) });
  }
  for (const c of model.categorical) {
    const raw = input[c.feature as FeatureName];
    const x = raw == null || Number.isNaN(raw) ? c.mode : raw;
    const level = c.levels.find((l) => l.value === x);
    const ref = c.levels.find((l) => l.value === c.mode);
    const term = level?.coef ?? 0; // unknown category → all-zero one-hot (handle_unknown="ignore")
    logit += term;
    contributions.push({ feature: c.feature as FeatureName, logit: term - (ref?.coef ?? 0) });
  }

  const probability = sigmoid(logit);
  contributions.sort((a, b) => Math.abs(b.logit) - Math.abs(a.logit));
  return { probability, predictedClass: probability >= 0.5 ? 1 : 0, logit, contributions };
}

export const MODEL_INFO = { name: model.name, source: model.source, featureCount: FEATURES.length };
