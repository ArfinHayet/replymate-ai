import { useCallback, useEffect, useMemo, useState } from "react";
import type { AllowedDomain, WidgetKey } from "../model/entities/WidgetSettings";
import { createEmbedService } from "../model/services/createEmbedService";
import type { EmbedViewModel } from "./EmbedViewModel";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useEmbedViewModel(): EmbedViewModel {
  const embedService = useMemo(() => createEmbedService(), []);
  const [keys, setKeys] = useState<WidgetKey[]>([]);
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [domainsError, setDomainsError] = useState<string | null>(null);

  const loadWidgetKeys = useCallback(async () => {
    try {
      setLoadingKeys(true);
      setKeysError(null);
      setKeys(await embedService.listWidgetKeys());
      return { success: true };
    } catch {
      const errorMessage = "Failed to load widget keys";
      setKeysError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoadingKeys(false);
    }
  }, [embedService]);

  const loadAllowedDomains = useCallback(async () => {
    try {
      setLoadingDomains(true);
      setDomainsError(null);
      setDomains(await embedService.listAllowedDomains());
      return { success: true };
    } catch {
      const errorMessage = "Failed to load allowed domains";
      setDomainsError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoadingDomains(false);
    }
  }, [embedService]);

  useEffect(() => {
    void Promise.resolve().then(loadWidgetKeys);
    void Promise.resolve().then(loadAllowedDomains);
  }, [loadAllowedDomains, loadWidgetKeys]);

  const createKey = async () => {
    if (!newLabel.trim()) return { success: false, errorMessage: "Add a label before creating a widget key" };

    try {
      const created = await embedService.createWidgetKey(newLabel);
      setKeys((prev) => [created, ...prev]);
      setNewLabel("");
      return { success: true, message: "Widget key created" };
    } catch {
      return { success: false, errorMessage: "Failed to create widget key" };
    }
  };

  const deleteKey = async (id: string) => {
    try {
      await embedService.deleteWidgetKey(id);
      setKeys((prev) => prev.filter((key) => key.id !== id));
      return { success: true, message: "Widget key deleted" };
    } catch {
      return { success: false, errorMessage: "Failed to delete widget key" };
    }
  };

  const latestKey = useMemo(
    () =>
      [...keys].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    [keys],
  );

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      return { success: true, message: "Widget key copied" };
    } catch {
      return { success: false, errorMessage: "Failed to copy key" };
    }
  };

  const copyLatestSnippet = async () => {
    if (!latestKey) return { success: false, errorMessage: "Create a widget key first" };
    try {
      await navigator.clipboard.writeText(embedService.createSnippet(latestKey.key, API_URL));
      return { success: true, message: "Embed script copied" };
    } catch {
      return { success: false, errorMessage: "Failed to copy script" };
    }
  };

  const createDomain = async () => {
    if (!newDomain.trim()) return { success: false };
    try {
      const created = await embedService.createAllowedDomain(newDomain);
      setDomains((prev) => [created, ...prev]);
      setNewDomain("");
      return { success: true, message: "Domain added" };
    } catch {
      return { success: false, errorMessage: "Failed to add domain" };
    }
  };

  const deleteDomain = async (id: string) => {
    try {
      await embedService.deleteAllowedDomain(id);
      setDomains((prev) => prev.filter((domain) => domain.id !== id));
      return { success: true, message: "Domain removed" };
    } catch {
      return { success: false, errorMessage: "Failed to remove domain" };
    }
  };

  return {
    keys,
    domains,
    newLabel,
    newDomain,
    loadingKeys,
    loadingDomains,
    keysError,
    domainsError,
    apiUrl: API_URL,
    snippetTemplate: embedService.createSnippetTemplate(API_URL),
    latestSnippet: latestKey ? embedService.createSnippet(latestKey.key, API_URL) : embedService.createSnippetTemplate(API_URL),
    loadWidgetKeys,
    loadAllowedDomains,
    setNewLabel,
    setNewDomain,
    createKey,
    deleteKey,
    copyKey,
    copyLatestSnippet,
    createDomain,
    deleteDomain,
  };
}
