import type { AllowedDomain, ChatToolConfig, WidgetKey } from "../entities/WidgetSettings";

export interface EmbedRepository {
  listWidgetKeys(): Promise<WidgetKey[]>;
  createWidgetKey(label: string): Promise<WidgetKey>;
  deleteWidgetKey(id: string): Promise<void>;
  listAllowedDomains(): Promise<AllowedDomain[]>;
  createAllowedDomain(domain: string): Promise<AllowedDomain>;
  deleteAllowedDomain(id: string): Promise<void>;
  listChatToolConfigs(): Promise<ChatToolConfig[]>;
}
