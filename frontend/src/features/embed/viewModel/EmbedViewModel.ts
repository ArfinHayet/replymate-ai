import type { AllowedDomain, WidgetKey } from "../model/entities/WidgetSettings";

export interface EmbedActionResult {
  success: boolean;
  message?: string;
  errorMessage?: string;
}

export interface EmbedViewModel {
  keys: WidgetKey[];
  domains: AllowedDomain[];
  newLabel: string;
  newDomain: string;
  loadingKeys: boolean;
  loadingDomains: boolean;
  loadingToolConfigs: boolean;
  keysError: string | null;
  domainsError: string | null;
  toolConfigsError: string | null;
  apiUrl: string;
  flightCardSelector: string;
  snippetTemplate: string;
  latestSnippet: string;
  publicChatUrlTemplate: string;
  latestPublicChatUrl: string;
  loadWidgetKeys(): Promise<EmbedActionResult>;
  loadAllowedDomains(): Promise<EmbedActionResult>;
  loadChatToolConfigs(): Promise<EmbedActionResult>;
  setNewLabel(value: string): void;
  setNewDomain(value: string): void;
  createKey(): Promise<EmbedActionResult>;
  deleteKey(id: string): Promise<EmbedActionResult>;
  copyKey(key: string): Promise<EmbedActionResult>;
  copyLatestSnippet(): Promise<EmbedActionResult>;
  copyLatestPublicChatUrl(): Promise<EmbedActionResult>;
  createDomain(): Promise<EmbedActionResult>;
  deleteDomain(id: string): Promise<EmbedActionResult>;
}
