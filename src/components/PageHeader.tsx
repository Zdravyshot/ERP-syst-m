export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  );
}

export function PlaceholderCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}
