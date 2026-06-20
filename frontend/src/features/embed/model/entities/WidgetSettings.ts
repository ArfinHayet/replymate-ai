export interface WidgetKey {
  id: string;
  key: string;
  label: string;
  createdAt: string;
}

export interface AllowedDomain {
  id: string;
  domain: string;
  createdAt: string;
}

export type ChatToolKey = "flight_search" | "live_agent_contact" | "ecommerce_product";

export interface ChatToolConfig {
  toolKey: ChatToolKey;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
