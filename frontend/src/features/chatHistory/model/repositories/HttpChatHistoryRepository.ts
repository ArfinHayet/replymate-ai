import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { ChatSession } from "../entities/ChatSession";
import type { ChatHistoryRepository } from "./ChatHistoryRepository";

export class HttpChatHistoryRepository implements ChatHistoryRepository {
  async listSessions(): Promise<ChatSession[]> {
    const response = await api.get<ChatSession[]>(apiRoutes.chat.history);
    return response.data;
  }
}
