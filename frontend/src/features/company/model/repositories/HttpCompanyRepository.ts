import { api } from "@/lib/api";
import { apiRoutes } from "@/lib/apiRoutes";
import type { CompanyUpsertDto } from "../dto/CompanyUpsertDto";
import type { Company } from "../entities/Company";
import type { CompanyRepository } from "./CompanyRepository";

export class HttpCompanyRepository implements CompanyRepository {
  async list(): Promise<Company[]> {
    const response = await api.get<Company[]>(apiRoutes.company.list);
    return response.data;
  }

  async create(data: CompanyUpsertDto): Promise<Company> {
    const response = await api.post<Company>(apiRoutes.company.list, data);
    return response.data;
  }

  async update(id: string, data: Partial<CompanyUpsertDto>): Promise<Company> {
    const response = await api.patch<Company>(apiRoutes.company.byId(id), data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(apiRoutes.company.byId(id));
  }
}
