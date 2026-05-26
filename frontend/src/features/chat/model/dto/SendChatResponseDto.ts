export interface SendChatResponseDto {
  answer: string;
  cached: boolean;
  action?: {
    type: "redirect";
    target: "new_tab";
    url: string;
    delayMs: number;
  };
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
