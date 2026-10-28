import type { FeatureName } from "@/lib/features";
import type { ScoreResult } from "@/lib/model";

export type ConfidenceLevel = "weak" | "moderate" | "strong";
export type Strength = "slight" | "moderate" | "strong";

/**
 * Model confidence = probability the model assigns to the class it picked, max(p, 1 − p).
 * It describes how decisively the model separates this record on 1988 dataset terms —
 * it is NOT the patient's clinical risk.
 */
export function modelConfidence(probability: number) {
  const confidence = Math.max(probability, 1 - probability);
  const level: ConfidenceLevel = confidence < 0.65 ? "weak" : confidence < 0.85 ? "moderate" : "strong";
  return { confidence, level };
}

export function strengthOf(logit: number): Strength {
  const a = Math.abs(logit);
  return a >= 1 ? "strong" : a >= 0.4 ? "moderate" : "slight";
}

export type Factor = { feature: FeatureName; direction: "up" | "down"; strength: Strength; logit: number };

/** Top influences (in log-odds vs a typical training patient), ignoring negligible ones. */
export function topFactors(result: ScoreResult, n = 3): Factor[] {
  return result.contributions
    .filter((c) => Math.abs(c.logit) >= 0.05)
    .slice(0, n)
    .map((c) => ({ feature: c.feature, direction: c.logit > 0 ? "up" : "down", strength: strengthOf(c.logit), logit: c.logit }));
}
