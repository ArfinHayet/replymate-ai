import { Skeleton } from "@/components/ui/skeleton";

export function PageLoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="min-h-dvh bg-rm-trip-surface">
      <div className="border-b border-gray-100 bg-white px-5 py-4 sm:px-8">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-44 max-w-full" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-24 shrink-0 rounded-rm-trip-smooth" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-8 sm:py-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-rm-trip-smooth" />
          <Skeleton className="h-24 rounded-rm-trip-smooth" />
          <Skeleton className="h-24 rounded-rm-trip-smooth" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <section className="space-y-5 rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card sm:p-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-11 w-full rounded-rm-trip-smooth" />
            <Skeleton className="h-11 w-full rounded-rm-trip-smooth" />
            <Skeleton className="h-28 w-full rounded-rm-trip-smooth" />
          </section>
          <aside className="space-y-4 rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card sm:p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full rounded-rm-trip-smooth" />
            <Skeleton className="h-16 w-full rounded-rm-trip-smooth" />
          </aside>
        </div>
      </div>
    </div>
  );
}
