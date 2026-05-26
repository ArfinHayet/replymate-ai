export interface ProfileCompletion {
  userId: string;
  hasCompanyInfo: boolean;
  hasContentSource: boolean;
  companyCount: number;
  pdfCount: number;
  webPageCount: number;
  completionPercent: number;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}
