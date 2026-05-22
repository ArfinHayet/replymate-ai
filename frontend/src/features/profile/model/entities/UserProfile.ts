export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
  usage: {
    plan: {
      id: number;
      name: string;
      monthlyLimit: number;
    };
    periodStart: string;
    periodEnd: string;
    usedMessages: number;
    remainingMessages: number;
  };
}
