import { Calendar, Loader2, Mail, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InlineError } from "@/components/ui/InlineError";
import type { UserProfile } from "../../model/entities/UserProfile";
import { useProfileViewModel } from "../../viewModel/useProfileViewModel";

function Avatar({ profile }: { profile: UserProfile }) {
  const initial = (profile.displayName?.[0] ?? profile.email[0] ?? "?").toUpperCase();

  if (profile.avatarUrl) {
    return <img src={profile.avatarUrl} alt={profile.displayName} className="h-24 w-24 rounded-full object-cover shadow-rm-trip-card ring-4 ring-white" />;
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rm-trip-brand shadow-rm-trip-card ring-4 ring-white">
      <span className="text-3xl font-bold text-white">{initial}</span>
    </div>
  );
}

export function ProfilePage() {
  const vm = useProfileViewModel();

  if (vm.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-rm-trip-brand" />
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
    <div className="flex h-full flex-col bg-rm-trip-surface">
      <PageHeader title="Profile" subtitle="Your account information." />
      <div className="flex flex-1 items-start justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg rounded-rm-trip-smooth border border-white/80 bg-white shadow-rm-trip-card">
          <div className="flex flex-col items-center gap-4 px-8 py-10 text-center sm:flex-row sm:text-left">
            <Avatar profile={vm.profile} />
            <div className="min-w-0">
              <h2 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text">{vm.profile.displayName}</h2>
              <p className="mt-1 text-sm font-medium text-rm-trip-text-muted">{vm.profile.email}</p>
            </div>
          </div>

          <dl className="divide-y divide-gray-100 border-t border-gray-100">
            <ProfileRow icon={<Mail className="h-4 w-4 shrink-0 text-rm-trip-text-muted" />} label="Email" value={vm.profile.email} />
            <ProfileRow icon={<Calendar className="h-4 w-4 shrink-0 text-rm-trip-text-muted" />} label="Joined" value={vm.joinedDate} />
            <ProfileRow icon={<UserRound className="h-4 w-4 shrink-0 text-rm-trip-text-muted" />} label="Display Name" value={vm.profile.displayName} />
          </dl>
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-8 py-4">
      {icon}
      <dt className="w-28 shrink-0 text-sm font-bold text-rm-trip-text">{label}</dt>
      <dd className="truncate text-sm text-rm-trip-text-muted">{value}</dd>
    </div>
  );
}
