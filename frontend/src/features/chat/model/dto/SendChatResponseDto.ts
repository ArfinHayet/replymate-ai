export interface SendChatResponseDto {
  answer: string;
  cached: boolean;
  usage?: {
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
