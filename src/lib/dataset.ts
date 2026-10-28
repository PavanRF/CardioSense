import rowsJson from "@/data/cleveland.json";
import evaluationJson from "@/data/evaluation.json";
import { FEATURES, type FeatureName, type PatientInput } from "@/lib/features";
import { score } from "@/lib/model";

export type PatientRow = Record<FeatureName, number | null> & {
  id: number;
  num: number;
  target: 0 | 1;
  split: "train" | "test";
};

export const ROWS = rowsJson as PatientRow[];
export const EVALUATION = evaluationJson;
export type ModelResult = (typeof evaluationJson.models)[number];

export const LIVE_RESULT = EVALUATION.models.find((m) => m.name === EVALUATION.live_model) as ModelResult;

export function getPatient(id: number): PatientRow | undefined {
  return ROWS.find((r) => r.id === id);
}

/** Missing ca/thal (6 source rows) fall back to the pipeline's training mode, as the imputer does. */
export function rowToInput(row: PatientRow): PatientInput {
  const fallback: Partial<Record<FeatureName, number>> = { ca: 0, thal: 3 };
  return Object.fromEntries(FEATURES.map((f) => [f, row[f] ?? fallback[f] ?? 0])) as PatientInput;
}

/** Every real record scored by the live model — deterministic, computed once. */
export const SCORED = ROWS.map((r) => ({ ...r, probability: score(r).probability }));

const byProb = [...SCORED].sort((a, b) => a.probability - b.probability);
export const SAMPLE_LOW_ID = (byProb[0] as (typeof SCORED)[number]).id;
export const SAMPLE_HIGH_ID = (byProb[byProb.length - 1] as (typeof SCORED)[number]).id;
