import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface Column<T> {
  key: string;
  label: string;
  /** Optional custom cell renderer. If omitted the cell renders String(item[key]). */
  render?: (item: T, index: number) => ReactNode;
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
  return (
    <div className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3.5 text-left text-xs font-semibold text-rm-trip-text-muted"
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
                  <td key={col.key} className="px-6 py-4">
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
                    <td key={col.key} className="px-6 py-4">
                      {col.render
                        ? col.render(item, index)
                        : String((item as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
