import { ChatToolKey } from './chat-tool-config.entity';

export type ChatRedirectAction = {
  type: 'redirect';
  target: 'new_tab';
  url: string;
  delayMs: number;
};

export type ChatToolRuntimeResult = {
  answer: string;
  action?: ChatRedirectAction;
};

export type ChatToolConfigResponse = {
  toolKey: ChatToolKey;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
};

export const CHAT_TOOL_KEYS: ChatToolKey[] = [
  'flight_search',
  'live_agent_contact',
];
