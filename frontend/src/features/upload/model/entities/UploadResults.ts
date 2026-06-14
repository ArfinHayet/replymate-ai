export interface PdfUploadResult {
  message: string;
  fileName: string;
  chunksCreated: number;
  pdfId: string;
}

export interface CsvUploadResult {
  message: string;
  fileName: string;
  rowsIngested: number;
  csvId: string;
}

export interface ImageUploadResult {
  id: string;
  title: string;
  description: string;
  storageUrl: string;
  createdAt: string;
}

export interface ImageAnalysisResult {
  title: string;
  description: string;
}

export interface IngestUrlResult {
  url: string;
  success: boolean;
  title?: string;
  chunksCreated?: number;
  pagesFetched?: number;
  pagesFailed?: number;
  webPageId?: string;
  error?: string;
}

export interface IngestUrlsResponse {
  pages: IngestUrlResult[];
}

export type IngestUrlsStreamEvent =
  | { type: "start"; total: number }
  | { type: "url-start"; url: string }
  | { type: "scanning"; rootUrl: string; url: string }
  | { type: "url-result"; result: IngestUrlResult }
  | { type: "done"; pages: IngestUrlResult[] };

export interface UrlScanItem {
  url: string;
  rootUrl?: string;
  status: "scanning" | "done" | "failed";
}
