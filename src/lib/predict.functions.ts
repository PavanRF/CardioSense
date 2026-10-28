import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MODEL_INFO, score } from "@/lib/model";
import { patientSchema } from "@/lib/validation";

// Server-verified scoring for signed-in users: re-validates the record on the server and
// scores it with the same fitted pipeline. Inputs are never logged or stored.
export const verifyPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => patientSchema.parse(data))
  .handler(async ({ data }) => {
    const result = score(data);
    return {
      probability: result.probability,
      predictedClass: result.predictedClass,
      model: MODEL_INFO.name,
      verifiedAt: new Date().toISOString(),
    };
  });

export const BATCH_CHUNK = 500;
const batchSchema = z.object({ rows: z.array(patientSchema).min(1).max(BATCH_CHUNK) });

/** Scores one chunk of already-validated rows; processed in memory only. */
export const scoreBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => batchSchema.parse(data))
  .handler(async ({ data }) => {
    return {
      model: MODEL_INFO.name,
      results: data.rows.map((r) => {
        const s = score(r);
        return { probability: s.probability, predictedClass: s.predictedClass };
      }),
    };
  });
