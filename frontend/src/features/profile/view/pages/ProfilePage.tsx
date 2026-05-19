import { Calendar, IdCard, Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { PageContent } from "@/components/layout/PageContent";
import { PageHeader } from "@/components/layout/PageHeader";
import { InlineError } from "@/components/ui/InlineError";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "../../model/entities/UserProfile";
import { useProfileViewModel } from "../../viewModel/useProfileViewModel";

function Avatar({ profile }: { profile: UserProfile }) {
  const initial = (profile.displayName?.[0] ?? profile.email[0] ?? "?").toUpperCase();

  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.displayName}
        className="h-20 w-20 rounded-rm-trip-smooth object-cover shadow-rm-trip-card ring-1 ring-gray-100 sm:h-24 sm:w-24"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-rm-trip-smooth bg-rm-trip-brand shadow-rm-trip-glow sm:h-24 sm:w-24">
      <span className="font-rm-trip-heading text-3xl font-bold text-white">{initial}</span>
    </div>
  );
}

export function ProfilePage() {
  const vm = useProfileViewModel();

  if (vm.loading) {
    return (
      <div className="min-h-screen bg-rm-trip-surface">
        <PageHeader title="Profile" subtitle="Loading your account information..." />
        <PageContent>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card sm:p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-rm-trip-smooth" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Skeleton className="h-7 w-48 max-w-full" />
                  <Skeleton className="h-4 w-64 max-w-full" />
                </div>
              </div>
            </div>
            <div className="rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card sm:p-6">
              <Loader2 className="h-5 w-5 animate-spin text-rm-trip-brand" />
            </div>
          </div>
        </PageContent>
      </div>
    );
  }

  if (vm.error || !vm.profile) {
    return (
      <div className="flex h-full items-center justify-center bg-rm-trip-surface p-8">
        <div className="w-full max-w-md">
          <UserRound className="mx-auto h-10 w-10 text-rm-trip-text-muted" />
          <div className="mt-4">
            <InlineError
              title="Could not load profile"
              message={vm.error ?? "Your account information is unavailable right now."}
              onRetry={() => void vm.loadProfile()}
              retrying={vm.loading}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader title="Profile" subtitle="Your ReplyMate AI account and workspace identity." />
      <PageContent>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="min-w-0 rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar profile={vm.profile} />
              <div className="min-w-0 flex-1">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-rm-trip-smooth border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-rm-trip-brand">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Active account
                </div>
                <h2 className="truncate font-rm-trip-heading text-2xl font-bold text-rm-trip-text">
                  {vm.profile.displayName || "ReplyMate user"}
                </h2>
                <p className="mt-1 truncate text-sm font-medium text-rm-trip-text-muted">{vm.profile.email}</p>
              </div>
            </div>
          </section>

          <section className="min-w-0 rounded-rm-trip-smooth border border-gray-100 bg-white p-5 shadow-rm-trip-card sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-rm-trip-text-muted">Account Summary</p>
            <div className="mt-4 grid gap-3">
              <SummaryItem label="Joined" value={vm.joinedDate} />
              <SummaryItem label="Profile ID" value={vm.profile.id} />
            </div>
          </section>
        </div>

        <section className="rounded-rm-trip-smooth border border-gray-100 bg-white shadow-rm-trip-card">
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <h3 className="font-rm-trip-heading text-base font-semibold text-rm-trip-text">Account Details</h3>
            <p className="mt-1 text-sm text-rm-trip-text-muted">Information used to identify your ReplyMate workspace user.</p>
          </div>

          <dl className="divide-y divide-gray-100 border-t border-gray-100">
            <ProfileRow icon={<UserRound className="h-4 w-4 shrink-0" />} label="Display Name" value={vm.profile.displayName || "Not set"} />
            <ProfileRow icon={<Mail className="h-4 w-4 shrink-0" />} label="Email" value={vm.profile.email} />
            <ProfileRow icon={<Calendar className="h-4 w-4 shrink-0" />} label="Joined" value={vm.joinedDate} />
            <ProfileRow icon={<IdCard className="h-4 w-4 shrink-0" />} label="User ID" value={vm.profile.id} />
          </dl>
        </section>
      </PageContent>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr] sm:items-center sm:px-6">
      <dt className="flex min-w-0 items-center gap-3 text-sm font-semibold text-rm-trip-text">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-rm-trip-smooth bg-gray-50 text-rm-trip-text-muted">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm font-medium text-rm-trip-text-muted sm:text-right">{value}</dd>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-rm-trip-smooth bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold text-rm-trip-text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-rm-trip-text">{value}</p>
    </div>
  );
}
