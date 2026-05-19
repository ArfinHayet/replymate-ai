import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  /** Optional custom cell renderer. If omitted the cell renders String(item[key]). */
  render?: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  /** Optional; defaults to array index. */
  getRowKey?: (item: T) => string | number;
  /** Extra classes per row. Function form varies by row. Defaults to "hover:bg-blue-50/20 cursor-default". */
  rowClassName?: string | ((item: T, index: number) => string);
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyState,
  getRowKey,
  rowClassName,
}: DataTableProps<T>) {
  const renderCell = (item: T, index: number, col: Column<T>) =>
    col.render ? col.render(item, index) : String((item as Record<string, unknown>)[col.key] ?? "");

  return (
    <div className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white shadow-rm-trip-card">
      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/90">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-rm-trip-text-muted",
                    col.headerClassName,
                    col.className,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-5 py-4", col.className)}>
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && data.length === 0 && emptyState && (
              <tr>
                <td colSpan={columns.length}>{emptyState}</td>
              </tr>
            )}

            {!isLoading &&
              data.map((item, index) => {
                const rowKey = getRowKey ? getRowKey(item) : index;
                const extra =
                  typeof rowClassName === "function"
                    ? rowClassName(item, index)
                    : (rowClassName ?? "hover:bg-blue-50/20 cursor-default");
                return (
                  <tr
                    key={rowKey}
                    className={`group border-b border-gray-50 last:border-0 transition-colors duration-100 ${extra}`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-5 py-4 align-middle", col.className)}>
                        {renderCell(item, index, col)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
