import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

/** Semicircular gauge for the model's class-1 probability. Colors mark dataset class, not risk levels. */
export function ProbabilityGauge({ value, locale, dimmed = false }: { value: number | null; locale: string; dimmed?: boolean }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value ?? 0);
  const pct = useTransform(mv, (v) =>
    new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v),
  );
  const needle = useTransform(mv, (v) => `rotate(${-90 + v * 180} 100 100)`);

  useEffect(() => {
    if (value == null) return;
    const controls = animate(mv, value, reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 });
    return () => controls.stop();
  }, [value, mv, reduce]);

  const isPositive = (value ?? 0) >= 0.5;
  const arc = "M 20 100 A 80 80 0 0 1 180 100";

  return (
    <div className={`relative mx-auto w-full max-w-[280px] transition-opacity ${dimmed ? "opacity-40" : ""}`}>
      <svg viewBox="0 0 200 118" className="w-full" role="img" aria-label={value == null ? "No estimate" : `${(value * 100).toFixed(1)} percent`}>
        <path d={arc} fill="none" stroke="var(--color-muted)" strokeWidth="14" strokeLinecap="round" />
        {/* 0.5 decision threshold tick */}
        <line x1="100" y1="14" x2="100" y2="30" stroke="var(--color-muted-foreground)" strokeWidth="2" strokeDasharray="2 2" />
        {value != null && (
          <motion.path
            d={arc}
            fill="none"
            stroke={isPositive ? "var(--color-positive)" : "var(--color-negative)"}
            strokeWidth="14"
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: Math.max(value, 0.001) }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}
          />
        )}
        {value != null && (
          <motion.g transform={needle}>
            <line x1="100" y1="100" x2="100" y2="34" stroke="var(--color-foreground)" strokeWidth="2.5" strokeLinecap="round" />
          </motion.g>
        )}
        <circle cx="100" cy="100" r="6" fill="var(--color-foreground)" />
        <text x="20" y="116" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">0%</text>
        <text x="100" y="10" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">50%</text>
        <text x="180" y="116" textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">100%</text>
      </svg>
      <div className="-mt-3 text-center">
        <motion.div className="font-mono text-4xl font-semibold tabular text-foreground">{value == null ? "—" : pct}</motion.div>
      </div>
    </div>
  );
}
