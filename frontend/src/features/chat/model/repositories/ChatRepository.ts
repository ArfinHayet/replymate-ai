import type { SendChatRequestDto } from "../dto/SendChatRequestDto";
import type { SendChatResponseDto } from "../dto/SendChatResponseDto";

export interface ChatRepository {
  sendMessage(request: SendChatRequestDto): Promise<SendChatResponseDto>;
  getSuggestions(): Promise<string[]>;
  updateSuggestions(suggestions: string[]): Promise<string[]>;
}
