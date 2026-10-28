// Feature codebook for the UCI Cleveland dataset (processed.cleveland.data).
// Codes are the original UCI encodings, which is exactly what the trained
// pipeline in scripts/train_model.py was fitted on (cp 1–4, slope 1–3, thal 3/6/7).

export const FEATURES = [
  "age",
  "sex",
  "cp",
  "trestbps",
  "chol",
  "fbs",
  "restecg",
  "thalach",
  "exang",
  "oldpeak",
  "slope",
  "ca",
  "thal",
] as const;

export type FeatureName = (typeof FEATURES)[number];
export type PatientInput = Record<FeatureName, number>;

export type NumericSpec = {
  kind: "numeric";
  min: number;
  max: number;
  step: number;
  integer: boolean;
  /** Range observed in the real dataset — used for a soft "outside training data" warning. */
  seen: [number, number];
};
export type CodeSpec = { kind: "code"; codes: number[] };
export type FeatureSpec = NumericSpec | CodeSpec;

export const FEATURE_SPECS: Record<FeatureName, FeatureSpec> = {
  age: { kind: "numeric", min: 18, max: 100, step: 1, integer: true, seen: [29, 77] },
  sex: { kind: "code", codes: [0, 1] },
  cp: { kind: "code", codes: [1, 2, 3, 4] },
  trestbps: { kind: "numeric", min: 80, max: 200, step: 1, integer: true, seen: [94, 200] },
  chol: { kind: "numeric", min: 100, max: 600, step: 1, integer: true, seen: [126, 564] },
  fbs: { kind: "code", codes: [0, 1] },
  restecg: { kind: "code", codes: [0, 1, 2] },
  thalach: { kind: "numeric", min: 60, max: 220, step: 1, integer: true, seen: [71, 202] },
  exang: { kind: "code", codes: [0, 1] },
  oldpeak: { kind: "numeric", min: 0, max: 6.5, step: 0.1, integer: false, seen: [0, 6.2] },
  slope: { kind: "code", codes: [1, 2, 3] },
  ca: { kind: "code", codes: [0, 1, 2, 3] },
  thal: { kind: "code", codes: [3, 6, 7] },
};

export const FEATURE_GROUPS: { key: string; features: FeatureName[] }[] = [
  { key: "predict.group.demo", features: ["age", "sex"] },
  { key: "predict.group.vitals", features: ["trestbps", "chol", "fbs", "thalach"] },
  { key: "predict.group.ecg", features: ["cp", "restecg", "exang", "oldpeak", "slope", "ca", "thal"] },
];

/** Median / most-frequent values of the training split — a neutral starting form. */
export const DEFAULT_INPUT: PatientInput = {
  age: 56,
  sex: 1,
  cp: 4,
  trestbps: 130,
  chol: 245,
  fbs: 0,
  restecg: 0,
  thalach: 154,
  exang: 0,
  oldpeak: 0.8,
  slope: 1,
  ca: 0,
  thal: 3,
};
