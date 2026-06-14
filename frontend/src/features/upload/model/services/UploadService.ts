import type { UploadRepository } from "../repositories/UploadRepository";
import { readFileAsDataUrl } from "./fileReaders";
import { validateCsvFile, validateImageFile, validateMarkdownFile, validatePdfFile } from "./fileValidation";
import { runSimulatedProgress } from "./simulatedProgress";

export class UploadService {
  private readonly uploadRepository: UploadRepository;

  constructor(uploadRepository: UploadRepository) {
    this.uploadRepository = uploadRepository;
  }

  validatePdf(file: File) {
    return validatePdfFile(file);
  }

  validateMarkdown(file: File) {
    return validateMarkdownFile(file);
  }

  validateImage(file: File) {
    return validateImageFile(file);
  }

  validateCsv(file: File) {
    return validateCsvFile(file);
  }

  uploadPdf(file: File, onProgress: (value: number) => void) {
    return this.uploadRepository.uploadPdf(file, onProgress);
  }

  uploadCsv(file: File, onProgress: (value: number) => void) {
    return this.uploadRepository.uploadCsv(file, onProgress);
  }

  ingestMarkdown(onProgress: (value: number) => void) {
    return runSimulatedProgress(80, onProgress);
  }

  ingestUrlsStream(urls: string[], onEvent: Parameters<UploadRepository["ingestUrlsStream"]>[1]) {
    return this.uploadRepository.ingestUrlsStream(urls, onEvent);
  }

  async analyzeImage(file: File) {
    const preview = await readFileAsDataUrl(file);
    const base64 = preview.split(",")[1] ?? "";
    const analysis = await this.uploadRepository.analyzeImage(base64, file.type);
    return { preview, analysis };
  }

  saveImage(file: File, title: string, description: string) {
    return this.uploadRepository.saveImage(file, title.trim(), description.trim());
  }
}
