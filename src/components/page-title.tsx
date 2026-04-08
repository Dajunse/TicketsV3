export function PageTitle({
  title,
  subtitle,
  rightSlot,
  titleClassName,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className={`font-title text-2xl tracking-tight text-zinc-900 ${titleClassName ?? ""}`}>{title}</h1>
        {subtitle ? <p className="text-sm text-zinc-600">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </div>
  );
}
