interface AuthBrandHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthBrandHeader({ title, subtitle }: AuthBrandHeaderProps) {
  return (
    <div className="mb-7 text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-rm-trip-smooth bg-white shadow-rm-trip-glow ring-1 ring-gray-100">
          <img src="/favicon.svg" alt="SupportMate AI" className="h-10 w-10" />
        </div>
      </div>
      <h1 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text">{title}</h1>
      <p className="mt-2 text-sm font-medium text-rm-trip-text-muted">{subtitle}</p>
    </div>
  );
}
