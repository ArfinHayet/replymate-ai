import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { SendChatRequestDto } from "../dto/SendChatRequestDto";
import type { SendChatResponseDto } from "../dto/SendChatResponseDto";
import type { ChatRepository } from "./ChatRepository";

export class HttpChatRepository implements ChatRepository {
  async sendMessage(request: SendChatRequestDto): Promise<SendChatResponseDto> {
    const response = await api.post<SendChatResponseDto>(apiRoutes.chat.send, request);
    return response.data;
  }

  async getSuggestions(): Promise<string[]> {
    const response = await api.get<{ suggestions: string[] }>(apiRoutes.chat.suggestions);
    return response.data.suggestions;
  }

  async updateSuggestions(suggestions: string[]): Promise<string[]> {
    const response = await api.post<{ suggestions: string[] }>(apiRoutes.chat.suggestions, {
      suggestions,
    });
    return response.data.suggestions;
  }
}
