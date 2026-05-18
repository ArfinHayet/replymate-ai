import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserProfile } from "../model/entities/UserProfile";
import { createProfileService } from "../model/services/createProfileService";
import type { ProfileViewModel } from "./ProfileViewModel";

export function useProfileViewModel(): ProfileViewModel {
  const profileService = useMemo(() => createProfileService(), []);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setProfile(await profileService.getCurrentUser());
      return { success: true };
    } catch {
      const errorMessage = "Failed to load profile.";
      setError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoading(false);
    }
  }, [profileService]);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  const joinedDate = profile
    ? new Date(profile.joinedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return { profile, loading, error, joinedDate, loadProfile };
}
