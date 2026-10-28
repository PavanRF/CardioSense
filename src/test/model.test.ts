import { describe, expect, it } from "vitest";
import parity from "@/data/parity.json";
import { score } from "@/lib/model";
import { validateField, validateForm } from "@/lib/validation";
import { DEFAULT_INPUT, FEATURES } from "@/lib/features";
import { toFormValues } from "@/lib/validation";

describe("in-browser scorer", () => {
  it("matches scikit-learn predict_proba on real Cleveland rows (incl. missing ca/thal)", () => {
    for (const row of parity) {
      expect(score(row.input as never).probability).toBeCloseTo(row.proba, 9);
    }
  });
});

describe("input validation", () => {
  it("rejects resting blood pressure above 200 mm Hg", () => {
    expect(validateField("trestbps", "201")).toEqual({ code: "range", min: 80, max: 200 });
  });
  it("rejects age below 18", () => {
    expect(validateField("age", "17")).toEqual({ code: "range", min: 18, max: 100 });
  });
  it("rejects ST depression above 6.5", () => {
    expect(validateField("oldpeak", "6.6")?.code).toBe("range");
    expect(validateField("oldpeak", "6.5")).toBeNull();
  });
  it("requires whole numbers for cholesterol", () => {
    expect(validateField("chol", "210.5")).toEqual({ code: "integer" });
  });
  it("flags blank fields as required", () => {
    expect(validateField("thalach", "  ")).toEqual({ code: "required" });
  });
  it("rejects codes outside the UCI codebook (thal must be 3, 6 or 7)", () => {
    expect(validateField("thal", "2")).toEqual({ code: "code" });
    expect(validateField("thal", "7")).toBeNull();
  });
  it("produces no model input while any field is invalid", () => {
    const values = { ...toFormValues(DEFAULT_INPUT), chol: "abc" };
    const res = validateForm(values);
    expect(res.input).toBeNull();
    expect(res.errors.chol).toEqual({ code: "number" });
    expect(Object.keys(validateForm(toFormValues(DEFAULT_INPUT)).errors)).toHaveLength(0);
    expect(FEATURES).toHaveLength(13);
  });
});

import en from "@/locales/en.json";
import es from "@/locales/es.json";
import hi from "@/locales/hi.json";
import { modelConfidence } from "@/lib/explain";

describe("translations", () => {
  it("Spanish and Hindi define every English key", () => {
    const keys = Object.keys(en).sort();
    expect(Object.keys(es).sort()).toEqual(keys);
    expect(Object.keys(hi).sort()).toEqual(keys);
  });
});

describe("model confidence", () => {
  it("is the probability of the predicted class, max(p, 1 − p)", () => {
    expect(modelConfidence(0.2).confidence).toBeCloseTo(0.8);
    expect(modelConfidence(0.9).confidence).toBeCloseTo(0.9);
  });
  it("calls scores near the 50% line weak", () => {
    expect(modelConfidence(0.55).level).toBe("weak");
    expect(modelConfidence(0.25).level).toBe("moderate");
    expect(modelConfidence(0.95).level).toBe("strong");
  });
});
