import { ChatToolKey } from '../chat-tool-config.entity';

export class UpdateChatToolConfigDto {
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export function isChatToolKey(value: string): value is ChatToolKey {
  return value === 'flight_search' || value === 'live_agent_contact';
}
