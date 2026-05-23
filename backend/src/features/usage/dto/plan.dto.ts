export class CreatePlanDto {
  id?: number;
  name!: string;
  monthlyMessageLimit!: number;
  creemProductId?: string | null;
  webCrawlLimit!: number;
  pdfUploadLimit!: number;
  imageUploadLimit!: number;
}

export class UpdatePlanDto {
  name?: string;
  monthlyMessageLimit?: number;
  creemProductId?: string | null;
  webCrawlLimit?: number;
  pdfUploadLimit?: number;
  imageUploadLimit?: number;
}
