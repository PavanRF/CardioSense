import { z } from "zod";
import { FEATURES, FEATURE_SPECS, type FeatureName, type PatientInput } from "@/lib/features";

export type FieldError =
  | { code: "required" }
  | { code: "number" }
  | { code: "integer" }
  | { code: "range"; min: number; max: number }
  | { code: "code" };

/** Form state holds raw strings so a half-typed value never silently becomes a number. */
export type FormValues = Record<FeatureName, string>;

export function validateField(name: FeatureName, raw: string): FieldError | null {
  const spec = FEATURE_SPECS[name];
  const text = raw.trim();
  if (text === "") return { code: "required" };
  const value = Number(text);
  if (!Number.isFinite(value)) return { code: "number" };
  if (spec.kind === "code") return spec.codes.includes(value) ? null : { code: "code" };
  if (spec.integer && !Number.isInteger(value)) return { code: "integer" };
  if (value < spec.min || value > spec.max) return { code: "range", min: spec.min, max: spec.max };
  return null;
}

export function validateForm(values: FormValues): {
  errors: Partial<Record<FeatureName, FieldError>>;
  input: PatientInput | null;
} {
  const errors: Partial<Record<FeatureName, FieldError>> = {};
  for (const f of FEATURES) {
    const e = validateField(f, values[f]);
    if (e) errors[f] = e;
  }
  if (Object.keys(errors).length > 0) return { errors, input: null };
  const input = Object.fromEntries(FEATURES.map((f) => [f, Number(values[f])])) as PatientInput;
  return { errors, input };
}

export function isOutsideTrainingRange(name: FeatureName, value: number): [number, number] | null {
  const spec = FEATURE_SPECS[name];
  if (spec.kind !== "numeric") return null;
  return value < spec.seen[0] || value > spec.seen[1] ? spec.seen : null;
}

export function toFormValues(input: PatientInput): FormValues {
  return Object.fromEntries(FEATURES.map((f) => [f, String(input[f])])) as FormValues;
}

/** Server-side schema — the same rules, enforced again on the server. */
export const patientSchema = z.object(
  Object.fromEntries(
    FEATURES.map((f) => {
      const spec = FEATURE_SPECS[f];
      const schema =
        spec.kind === "code"
          ? z.number().refine((v) => spec.codes.includes(v), { message: `${f}: unsupported code` })
          : (spec.integer ? z.number().int() : z.number()).min(spec.min).max(spec.max);
      return [f, schema];
    }),
  ) as unknown as Record<FeatureName, z.ZodType<number>>,
);
