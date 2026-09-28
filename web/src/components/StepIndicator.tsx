const STEPS = [
  { n: 1, label: "Trip Basics" },
  { n: 2, label: "Build Safari" },
  { n: 3, label: "Cart & Enquire" },
];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto flex max-w-xs items-start justify-center px-5 py-6 sm:max-w-sm sm:py-8">
      {STEPS.map((step, i) => (
        <li key={step.n} className={`flex items-start ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
          <div className="flex min-w-16 flex-col items-center gap-1.5">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                step.n <= current
                  ? "bg-accent text-black shadow-[0_3px_10px_rgba(253,203,8,0.26)]"
                  : "bg-[#efeee7] text-muted"
              }`}
            >
              {step.n < current ? "✓" : step.n}
            </span>
            <span
              className={`text-center text-[11px] font-medium leading-tight sm:text-xs ${
                step.n <= current ? "text-brand-dark" : "text-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-1.5 mt-4 h-px flex-1 rounded sm:mx-2 ${
                step.n < current ? "bg-brand" : "bg-border"
              }`}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
