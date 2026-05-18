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
  keysError: string | null;
  domainsError: string | null;
  apiUrl: string;
  snippetTemplate: string;
  loadWidgetKeys(): Promise<EmbedActionResult>;
  loadAllowedDomains(): Promise<EmbedActionResult>;
  setNewLabel(value: string): void;
  setNewDomain(value: string): void;
  createKey(): Promise<EmbedActionResult>;
  deleteKey(id: string): Promise<EmbedActionResult>;
  copySnippet(key: string): Promise<EmbedActionResult>;
  createDomain(): Promise<EmbedActionResult>;
  deleteDomain(id: string): Promise<EmbedActionResult>;
}
