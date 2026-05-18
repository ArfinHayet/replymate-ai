import type { UserProfile } from "../model/entities/UserProfile";

export interface ProfileViewModel {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  joinedDate: string;
  loadProfile(): Promise<{ success: boolean; errorMessage?: string }>;
}
