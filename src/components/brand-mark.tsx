export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground ${className}`}>
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
        <path
          d="M2 17h7l2.5-6 4 13 3.5-10 2 3H30"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ecg-pulse"
        />
      </svg>
    </span>
  );
}
