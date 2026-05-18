import { useCallback, useEffect, useMemo, useState } from "react";
import type { Company } from "../model/entities/Company";
import { emptyCompanyForm, type CompanyFormState } from "../model/entities/CompanyFormState";
import { createCompanyService } from "../model/services/createCompanyService";
import type { CompanyViewModel } from "./CompanyViewModel";

export function useCompanyViewModel(): CompanyViewModel {
  const companyService = useMemo(() => createCompanyService(), []);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyFormState>(emptyCompanyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setCompanies(await companyService.listCompanies());
      return { success: true };
    } catch {
      const errorMessage = "Failed to load companies";
      setError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoading(false);
    }
  }, [companyService]);

  useEffect(() => {
    void Promise.resolve().then(loadCompanies);
  }, [loadCompanies]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyCompanyForm);
    setFormOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditTarget(company);
    setForm({ name: company.name, shortDescription: company.shortDescription });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
  };

  const setFormName = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
  };

  const setFormShortDescription = (value: string) => {
    setForm((prev) => ({ ...prev, shortDescription: value }));
  };

  const saveCompany = async () => {
    if (!companyService.isValidForm(form)) return { success: false };

    setSaving(true);
    try {
      await companyService.saveCompany(editTarget, form);
      setFormOpen(false);
      await loadCompanies();
      return {
        success: true,
        message: editTarget ? "Company updated" : "Company created",
      };
    } catch {
      return { success: false, errorMessage: "Save failed" };
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (company: Company) => {
    setDeleteTarget(company);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const deleteCompany = async () => {
    if (!deleteTarget) return { success: false };

    setDeleting(true);
    try {
      await companyService.deleteCompany(deleteTarget.id);
      setDeleteTarget(null);
      await loadCompanies();
      return { success: true, message: "Company deleted" };
    } catch {
      return { success: false, errorMessage: "Delete failed" };
    } finally {
      setDeleting(false);
    }
  };

  return {
    companies,
    loading,
    error,
    formOpen,
    editTarget,
    form,
    saving,
    deleteTarget,
    deleting,
    canSave: companyService.isValidForm(form),
    loadCompanies,
    openCreate,
    openEdit,
    closeForm,
    setFormName,
    setFormShortDescription,
    saveCompany,
    requestDelete,
    cancelDelete,
    deleteCompany,
  };
}
