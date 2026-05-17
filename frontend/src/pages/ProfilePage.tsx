import { useEffect, useState } from "react";
import { Loader2, Mail, Calendar, UserRound } from "lucide-react";
import { getMe, type UserProfile } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";

function Avatar({ profile }: { profile: UserProfile }) {
  const initial = (profile.displayName?.[0] ?? profile.email[0] ?? "?").toUpperCase();

  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.displayName}
        className="h-24 w-24 rounded-full object-cover shadow-rm-trip-card ring-4 ring-white"
      />
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rm-trip-brand shadow-rm-trip-card ring-4 ring-white">
      <span className="text-3xl font-bold text-white">{initial}</span>
    </div>
  );
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setProfile)
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-rm-trip-brand" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <UserRound className="mx-auto h-10 w-10 text-rm-trip-text-muted" />
          <p className="mt-3 font-semibold text-rm-trip-text">Could not load profile</p>
          <p className="mt-1 text-sm text-rm-trip-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const joinedDate = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex h-full flex-col bg-rm-trip-surface">
      <PageHeader title="Profile" subtitle="Your account information." />

      <div className="flex flex-1 items-start justify-center p-6 sm:p-10">
        <div className="w-full max-w-lg">
          {/* Avatar + name card */}
          <div className="rounded-rm-trip-smooth border border-white/80 bg-white shadow-rm-trip-card">
            <div className="flex flex-col items-center gap-4 px-8 py-10 text-center sm:flex-row sm:text-left">
              <Avatar profile={profile} />
              <div className="min-w-0">
                <h2 className="font-rm-trip-heading text-2xl font-bold text-rm-trip-text">
                  {profile.displayName}
                </h2>
                <p className="mt-1 text-sm font-medium text-rm-trip-text-muted">{profile.email}</p>
              </div>
            </div>

            <div className="border-t border-gray-100">
              <dl className="divide-y divide-gray-100">
                <div className="flex items-center gap-4 px-8 py-4">
                  <Mail className="h-4 w-4 shrink-0 text-rm-trip-text-muted" />
                  <dt className="w-28 shrink-0 text-sm font-bold text-rm-trip-text">Email</dt>
                  <dd className="truncate text-sm text-rm-trip-text-muted">{profile.email}</dd>
                </div>

                <div className="flex items-center gap-4 px-8 py-4">
                  <Calendar className="h-4 w-4 shrink-0 text-rm-trip-text-muted" />
                  <dt className="w-28 shrink-0 text-sm font-bold text-rm-trip-text">Joined</dt>
                  <dd className="text-sm text-rm-trip-text-muted">{joinedDate}</dd>
                </div>

                <div className="flex items-center gap-4 px-8 py-4">
                  <UserRound className="h-4 w-4 shrink-0 text-rm-trip-text-muted" />
                  <dt className="w-28 shrink-0 text-sm font-bold text-rm-trip-text">Display Name</dt>
                  <dd className="text-sm text-rm-trip-text-muted">{profile.displayName}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
