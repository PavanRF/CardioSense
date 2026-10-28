import { FEATURES, type FeatureName, type PatientInput } from "@/lib/features";
import { validateField, type FieldError } from "@/lib/validation";

/** RFC 4180-style parser: quoted fields, escaped quotes, CRLF/LF, optional BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: (string | number)[][]) {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export type RowError = { line: number; column: FeatureName; value: string; error: FieldError };
export type ValidRow = { line: number; original: string[]; input: PatientInput };
export type BatchParse =
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "missingColumns"; missing: FeatureName[] }
  | { ok: false; reason: "tooManyRows"; max: number }
  | {
      ok: true;
      headers: string[];
      totalRows: number;
      emptyRows: number;
      valid: ValidRow[];
      invalidLines: number[];
      errors: RowError[];
      ignoredColumns: string[];
    };

export const MAX_BATCH_ROWS = 10_000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Validates every data row independently. A bad value rejects only that row, with its
 * spreadsheet line number (header = line 1). Extra columns (e.g. an id or the target
 * label) are preserved in the output but never used as model inputs.
 */
export function validateBatch(text: string): BatchParse {
  const table = parseCsv(text);
  if (table.length === 0) return { ok: false, reason: "empty" };
  const headers = (table[0] ?? []).map((h) => h.trim());
  const lower = headers.map((h) => h.toLowerCase());
  const index = Object.fromEntries(FEATURES.map((f) => [f, lower.indexOf(f)])) as Record<FeatureName, number>;
  const missing = FEATURES.filter((f) => index[f] === -1);
  if (missing.length) return { ok: false, reason: "missingColumns", missing };

  const body = table.slice(1);
  if (body.length > MAX_BATCH_ROWS + 1000) return { ok: false, reason: "tooManyRows", max: MAX_BATCH_ROWS };

  const valid: ValidRow[] = [];
  const errors: RowError[] = [];
  const invalidLines: number[] = [];
  let emptyRows = 0;
  let totalRows = 0;

  body.forEach((cells, i) => {
    const line = i + 2;
    if (cells.every((c) => c.trim() === "")) {
      emptyRows++;
      return;
    }
    totalRows++;
    const rowErrors: RowError[] = [];
    const input = {} as PatientInput;
    for (const f of FEATURES) {
      const raw = (cells[index[f]] ?? "").trim();
      const e = validateField(f, raw);
      if (e) rowErrors.push({ line, column: f, value: raw, error: e });
      else input[f] = Number(raw);
    }
    if (rowErrors.length) {
      errors.push(...rowErrors);
      invalidLines.push(line);
    } else {
      const original = headers.map((_, k) => cells[k] ?? "");
      valid.push({ line, original, input });
    }
  });

  if (totalRows > MAX_BATCH_ROWS) return { ok: false, reason: "tooManyRows", max: MAX_BATCH_ROWS };
  if (totalRows === 0) return { ok: false, reason: "empty" };

  const ignoredColumns = headers.filter((h) => !FEATURES.includes(h.toLowerCase() as FeatureName) && h !== "");
  return { ok: true, headers, totalRows, emptyRows, valid, invalidLines, errors, ignoredColumns };
}
