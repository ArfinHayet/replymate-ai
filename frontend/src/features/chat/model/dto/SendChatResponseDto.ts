export interface SendChatResponseDto {
  answer: string;
  cached: boolean;
  usage?: {
    plan: {
      id: number;
      name: string;
      monthlyMessageLimit: number;
    };
    periodStart: string;
    periodEnd: string;
    usedMessages: number;
    remainingMessages: number;
  };
}
