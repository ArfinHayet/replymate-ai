import type { EmbedRepository } from "../repositories/EmbedRepository";

export class EmbedService {
  private readonly repository: EmbedRepository;

  constructor(repository: EmbedRepository) {
    this.repository = repository;
  }

  listWidgetKeys() {
    return this.repository.listWidgetKeys();
  }

  createWidgetKey(label: string) {
    return this.repository.createWidgetKey(label.trim());
  }

  deleteWidgetKey(id: string) {
    return this.repository.deleteWidgetKey(id);
  }

  listAllowedDomains() {
    return this.repository.listAllowedDomains();
  }

  createAllowedDomain(domain: string) {
    return this.repository.createAllowedDomain(domain.trim());
  }

  deleteAllowedDomain(id: string) {
    return this.repository.deleteAllowedDomain(id);
  }

  listChatToolConfigs() {
    return this.repository.listChatToolConfigs();
  }

  createSnippet(key: string, apiUrl: string, flightCardSelector = "", productCardSelector = "") {
    return this.createSnippetFromKey(key, apiUrl, flightCardSelector, productCardSelector);
  }

  createSnippetTemplate(apiUrl: string, flightCardSelector = "", productCardSelector = "") {
    return this.createSnippetFromKey("YOUR_KEY", apiUrl, flightCardSelector, productCardSelector);
  }

  createPublicChatUrl(key: string, apiUrl: string) {
    return `${apiUrl}/widget/${encodeURIComponent(key)}`;
  }

  createPublicChatUrlTemplate(apiUrl: string) {
    return `${apiUrl}/widget/YOUR_KEY`;
  }

  private createSnippetFromKey(key: string, apiUrl: string, flightCardSelector: string, productCardSelector: string) {
    const flightSelectorAttribute = flightCardSelector.trim()
      ? `\n  data-flight-card-selector="${escapeHtmlAttribute(flightCardSelector.trim())}"`
      : "";

    const productSelectorAttribute = productCardSelector.trim()
      ? `\n  data-product-card-selector="${escapeHtmlAttribute(productCardSelector.trim())}"`
      : "";

    return `<script src="${apiUrl}/widget.js"\n  data-key="${key}"\n  data-api="${apiUrl}"${flightSelectorAttribute}${productSelectorAttribute}>\n</script>`;
  }
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
