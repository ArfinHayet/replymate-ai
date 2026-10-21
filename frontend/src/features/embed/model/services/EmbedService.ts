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

  createSnippet(key: string, apiUrl: string) {
    return this.createSnippetFromKey(key, apiUrl);
  }

  createSnippetTemplate(apiUrl: string) {
    return this.createSnippetFromKey("YOUR_KEY", apiUrl);
  }

  createPublicChatUrl(key: string, apiUrl: string) {
    return `${apiUrl}/widget/${encodeURIComponent(key)}`;
  }

  createPublicChatUrlTemplate(apiUrl: string) {
    return `${apiUrl}/widget/YOUR_KEY`;
  }

  private createSnippetFromKey(key: string, apiUrl: string) {
    return `<script src="${apiUrl}/widget.js"\n  data-key="${key}"\n  data-api="${apiUrl}">\n</script>`;
  }
}
