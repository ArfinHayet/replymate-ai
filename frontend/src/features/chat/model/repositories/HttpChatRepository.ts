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
}
