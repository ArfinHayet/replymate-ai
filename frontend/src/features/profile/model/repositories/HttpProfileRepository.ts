import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { UserProfile } from "../entities/UserProfile";
import type { ProfileRepository } from "./ProfileRepository";

export class HttpProfileRepository implements ProfileRepository {
  async getCurrentUser(): Promise<UserProfile> {
    const response = await api.get<UserProfile>(apiRoutes.auth.me);
    return response.data;
  }
}
