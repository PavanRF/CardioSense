import { AlertCircle, Info, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FEATURE_SPECS, type FeatureName } from "@/lib/features";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { isOutsideTrainingRange, type FieldError } from "@/lib/validation";

export function errorMessage(t: ReturnType<typeof useI18n>["t"], e: FieldError) {
  if (e.code === "range") return t("validation.range", { min: e.min, max: e.max });
  return t(`validation.${e.code}`);
}

const SEGMENTED: FeatureName[] = ["sex", "fbs", "exang", "ca"];

export function FeatureField({
  name,
  value,
  error,
  onChange,
}: {
  name: FeatureName;
  value: string;
  error: FieldError | undefined;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const spec = FEATURE_SPECS[name];
  const id = `field-${name}`;
  const errId = `${id}-error`;
  const unitKey = `f.${name}.unit`;
  const unit = t(unitKey) === unitKey ? null : t(unitKey);
  const numeric = Number(value);
  const outside = !error && spec.kind === "numeric" ? isOutsideTrainingRange(name, numeric) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {t(`f.${name}.label`)}
        </label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="rounded text-muted-foreground hover:text-foreground" aria-label={t(`f.${name}.hint`)}>
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{t(`f.${name}.hint`)}</TooltipContent>
        </Tooltip>
        <code className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{name}</code>
      </div>

      {spec.kind === "numeric" ? (
        <>
          <div className="relative">
            <Input
              id={id}
              inputMode="decimal"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? errId : undefined}
              className={cn(
                "h-10 pr-16 font-mono tabular transition-colors",
                error && "border-destructive focus-visible:ring-destructive",
              )}
            />
            {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
          </div>
          <Slider
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={[Number.isFinite(numeric) ? Math.min(Math.max(numeric, spec.min), spec.max) : spec.min]}
            onValueChange={([v]) => v != null && onChange(spec.integer ? String(Math.round(v)) : v.toFixed(1))}
            aria-label={t(`f.${name}.label`)}
          />
        </>
      ) : SEGMENTED.includes(name) ? (
        <div role="radiogroup" aria-labelledby={id} id={id} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
          {spec.codes.map((c) => {
            const active = value === String(c);
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(String(c))}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                  active ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {name === "ca" ? c : t(`opt.${name}.${c}`)}
              </button>
            );
          })}
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className={cn("h-10", error && "border-destructive")} aria-invalid={!!error}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {spec.codes.map((c) => (
              <SelectItem key={c} value={String(c)}>
                <span className="mr-2 font-mono text-xs text-muted-foreground">{c}</span>
                {t(`opt.${name}.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errId}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex items-center gap-1.5 text-xs font-medium text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {errorMessage(t, error)}
          </motion.p>
        )}
        {outside && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-1.5 text-xs text-warning"
          >
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("validation.outOfTraining", { min: outside[0], max: outside[1] })}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
