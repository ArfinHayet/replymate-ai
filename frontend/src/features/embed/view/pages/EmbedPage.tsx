import { Code2, Copy, Globe, Key, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmbedViewModel } from "../../viewModel/useEmbedViewModel";

export function EmbedPage() {
  const vm = useEmbedViewModel();

  const run = async (action: Promise<{ message?: string; errorMessage?: string }>) => {
    const result = await action;
    if (result.message) toast.success(result.message);
    if (result.errorMessage) toast.error(result.errorMessage);
  };

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader title="Website Widget" subtitle="Create widget keys and control which websites can use your assistant." />
      <PageContent>
        <div className="mx-auto space-y-6">
          <section className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white">
            <SectionHeader icon={<Key className="h-3.5 w-3.5 text-rm-trip-brand" />} title="Widget Keys" />
            <div className="space-y-5 p-6">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  placeholder="Label, for example: Marketing site"
                  value={vm.newLabel}
                  onChange={(event) => vm.setNewLabel(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void run(vm.createKey())}
                  className="flex-1 rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus-rm-trip-highlight"
                />
                <button
                  onClick={() => void run(vm.createKey())}
                  className="flex items-center justify-center gap-1.5 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-2.5 text-sm font-semibold text-white shadow-rm-trip-card"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create
                </button>
              </div>

              {vm.loadingKeys ? (
                <TableSkeleton columns="grid-cols-[1.2fr_2fr_1fr_80px]" />
              ) : vm.keysError ? (
                <InlineError
                  title="Could not load widget keys"
                  message="Widget keys are unavailable right now."
                  onRetry={() => void run(vm.loadWidgetKeys())}
                  retrying={vm.loadingKeys}
                />
              ) : vm.keys.length === 0 ? (
                <p className="text-sm text-rm-trip-text-muted">No widget keys yet. Create one above.</p>
              ) : (
                <div className="overflow-x-auto rounded-rm-trip-smooth border border-gray-100">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <Th>Label</Th>
                        <Th>Key</Th>
                        <Th>Created</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {vm.keys.map((item) => (
                        <tr key={item.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3 font-medium text-rm-trip-text">{item.label}</td>
                          <td className="px-4 py-3">
                            <code className="rounded-md bg-rm-trip-brand/10 px-2 py-0.5 font-mono text-xs text-rm-trip-brand">
                              {item.key}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-xs text-rm-trip-text-muted">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                title="Copy key"
                                onClick={() => void run(vm.copyKey(item.key))}
                                className="flex h-7 w-7 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-rm-trip-brand/10 hover:text-rm-trip-brand"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                title="Delete key"
                                onClick={() => void run(vm.deleteKey(item.id))}
                                className="flex h-7 w-7 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-red-50 hover:text-rm-trip-state-error"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {vm.keys.length > 0 && (
                <div className="rounded-rm-trip-smooth border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 shrink-0 text-rm-trip-text-muted" />
                      <p className="truncate text-xs font-semibold text-rm-trip-text-muted">
                        Embed script using your latest widget key
                      </p>
                    </div>
                    <button
                      onClick={() => void run(vm.copyLatestSnippet())}
                      className="inline-flex items-center justify-center gap-1.5 rounded-rm-trip-smooth border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-rm-trip-text-muted shadow-sm transition-all hover:text-rm-trip-brand"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Script
                    </button>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-rm-trip-text">
                    {vm.latestSnippet}
                  </pre>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-rm-trip-smooth border border-gray-100 bg-white">
            <SectionHeader icon={<Globe className="h-3.5 w-3.5 text-rm-trip-brand" />} title="Allowed Domains" />
            <div className="space-y-5 p-6">
              <p className="text-sm leading-relaxed text-rm-trip-text-muted">
                Add the exact website origin allowed to use your assistant, for example https://example.com.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={vm.newDomain}
                  onChange={(event) => vm.setNewDomain(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void run(vm.createDomain())}
                  className="flex-1 rounded-rm-trip-smooth border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus-rm-trip-highlight"
                />
                <button
                  onClick={() => void run(vm.createDomain())}
                  className="flex items-center justify-center gap-1.5 rounded-rm-trip-smooth bg-rm-trip-brand px-4 py-2.5 text-sm font-semibold text-white shadow-rm-trip-card"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>

              {vm.loadingDomains ? (
                <TableSkeleton columns="grid-cols-[2fr_1fr_48px]" />
              ) : vm.domainsError ? (
                <InlineError
                  title="Could not load allowed domains"
                  message="Allowed domains are unavailable right now."
                  onRetry={() => void run(vm.loadAllowedDomains())}
                  retrying={vm.loadingDomains}
                />
              ) : vm.domains.length === 0 ? (
                <p className="text-sm text-rm-trip-text-muted">No allowed domains yet.</p>
              ) : (
                <div className="overflow-hidden rounded-rm-trip-smooth border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <Th>Domain</Th>
                        <Th>Added</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {vm.domains.map((domain) => (
                        <tr key={domain.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3 font-medium text-rm-trip-text">{domain.domain}</td>
                          <td className="px-4 py-3 text-xs text-rm-trip-text-muted">
                            {new Date(domain.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => void run(vm.deleteDomain(domain.id))}
                              className="ml-auto flex h-7 w-7 items-center justify-center rounded-rm-trip-smooth text-rm-trip-text-muted hover:bg-red-50 hover:text-rm-trip-state-error"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </PageContent>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand/10">{icon}</div>
      <h2 className="font-rm-trip-heading text-sm font-semibold text-rm-trip-text">{title}</h2>
    </div>
  );
}

function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-rm-trip-text-muted">
      {children}
    </th>
  );
}

function TableSkeleton({ columns }: { columns: string }) {
  return (
    <div className="overflow-hidden rounded-rm-trip-smooth border border-gray-100">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className={`grid ${columns} items-center gap-4 border-b border-gray-50 px-4 py-3 last:border-0`}
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
