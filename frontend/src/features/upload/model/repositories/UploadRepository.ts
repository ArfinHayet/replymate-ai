import type {
  CsvUploadResult,
  ImageAnalysisResult,
  ImageUploadResult,
  IngestUrlsResponse,
  IngestUrlsStreamEvent,
  PdfUploadResult,
} from "../entities/UploadResults";

export interface UploadRepository {
  uploadPdf(file: File, onProgress?: (pct: number) => void): Promise<PdfUploadResult>;
  uploadCsv(file: File, onProgress?: (pct: number) => void): Promise<CsvUploadResult>;
  ingestUrlsStream(urls: string[], onEvent: (event: IngestUrlsStreamEvent) => void): Promise<IngestUrlsResponse>;
  analyzeImage(base64: string, mimeType: string): Promise<ImageAnalysisResult>;
  saveImage(file: File, title: string, description: string): Promise<ImageUploadResult>;
}
