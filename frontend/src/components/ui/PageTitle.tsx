import { cn } from "../../lib/utils";

interface PageTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageTitle({ eyebrow, title, subtitle, actions, className }: PageTitleProps) {
  return (
    <header
      className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="max-w-2xl text-sm text-slate-600 md:text-base">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
