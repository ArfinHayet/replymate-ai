import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { PdfDocument } from "../entities/PdfDocument";
import type { PdfRepository } from "./PdfRepository";

export class HttpPdfRepository implements PdfRepository {
  async list(): Promise<PdfDocument[]> {
    const response = await api.get<PdfDocument[]>(apiRoutes.pdfs.list);
    return response.data;
  }

  async rename(id: string, fileName: string): Promise<PdfDocument> {
    const response = await api.patch<PdfDocument>(apiRoutes.pdfs.byId(id), { fileName });
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(apiRoutes.pdfs.byId(id));
  }
}
