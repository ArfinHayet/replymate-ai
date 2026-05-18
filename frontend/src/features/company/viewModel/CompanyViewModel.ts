import type { Company } from "../model/entities/Company";
import type { CompanyFormState } from "../model/entities/CompanyFormState";

export interface CompanyViewModel {
  companies: Company[];
  loading: boolean;
  error: string | null;
  formOpen: boolean;
  editTarget: Company | null;
  form: CompanyFormState;
  saving: boolean;
  deleteTarget: Company | null;
  deleting: boolean;
  canSave: boolean;
  loadCompanies(): Promise<{ success: boolean; errorMessage?: string }>;
  openCreate(): void;
  openEdit(company: Company): void;
  closeForm(): void;
  setFormName(value: string): void;
  setFormShortDescription(value: string): void;
  saveCompany(): Promise<{ success: boolean; message?: string; errorMessage?: string }>;
  requestDelete(company: Company): void;
  cancelDelete(): void;
  deleteCompany(): Promise<{ success: boolean; message?: string; errorMessage?: string }>;
}
