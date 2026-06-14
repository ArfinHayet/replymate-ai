import { API_BASE_URL, api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import { getToken } from "@/lib/auth";
import type {
  CsvUploadResult,
  ImageAnalysisResult,
  ImageUploadResult,
  IngestUrlResult,
  IngestUrlsResponse,
  IngestUrlsStreamEvent,
  PdfUploadResult,
} from "../entities/UploadResults";
import type { UploadRepository } from "./UploadRepository";

export class HttpUploadRepository implements UploadRepository {
  async uploadPdf(file: File, onProgress?: (pct: number) => void): Promise<PdfUploadResult> {
    const form = new FormData();
    form.append("file", file);

    const response = await api.post<PdfUploadResult>(apiRoutes.upload.pdf, form, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  }

  async uploadCsv(file: File, onProgress?: (pct: number) => void): Promise<CsvUploadResult> {
    const form = new FormData();
    form.append("file", file);

    const response = await api.post<CsvUploadResult>(apiRoutes.upload.csv, form, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  }

  ingestUrlsStream(urls: string[], onEvent: (event: IngestUrlsStreamEvent) => void): Promise<IngestUrlsResponse> {
    return streamIngestUrls(urls, onEvent);
  }

  async analyzeImage(base64: string, mimeType: string): Promise<ImageAnalysisResult> {
    const response = await api.post<ImageAnalysisResult>(apiRoutes.images.analyze, { base64, mimeType });
    return response.data;
  }

  async saveImage(file: File, title: string, description: string): Promise<ImageUploadResult> {
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("description", description);

    const response = await api.post<ImageUploadResult>(apiRoutes.images.list, form);
    return response.data;
  }
}

async function streamIngestUrls(
  urls: string[],
  onEvent: (event: IngestUrlsStreamEvent) => void,
): Promise<IngestUrlsResponse> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${apiRoutes.upload.urls}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ urls }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (!response.body) throw new Error("Streaming is not supported by this browser");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPages: IngestUrlResult[] = [];

  const emitBlock = (block: string) => {
    const lines = block.split(/\r?\n/);
    let eventName = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;

    const data = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
    if (eventName === "start") {
      onEvent({ type: "start", total: Number(data.total ?? 0) });
    } else if (eventName === "url-start") {
      onEvent({ type: "url-start", url: String(data.url ?? "") });
    } else if (eventName === "scanning") {
      onEvent({
        type: "scanning",
        rootUrl: String(data.rootUrl ?? ""),
        url: String(data.url ?? ""),
      });
    } else if (eventName === "url-result") {
      onEvent({ type: "url-result", result: data as unknown as IngestUrlResult });
    } else if (eventName === "done") {
      finalPages = (data.pages ?? []) as IngestUrlResult[];
      onEvent({ type: "done", pages: finalPages });
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\n\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(emitBlock);
  }

  buffer += decoder.decode();
  if (buffer.trim()) emitBlock(buffer);

  return { pages: finalPages };
}

async function readErrorMessage(response: Response) {
  let message = "Unable to add URLs";
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? message;
  } catch {
    const text = await response.text();
    if (text) message = text;
  }
  return message;
}
