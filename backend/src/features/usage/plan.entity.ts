import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("plan")
export class Plan {
  @PrimaryColumn({ type: "int" })
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ name: "monthly_message_limit", type: "int", default: 0 })
  monthlyMessageLimit!: number;

  @Column({ name: "creem_product_id", type: "varchar", nullable: true })
  creemProductId?: string | null;

  @Column({ name: "web_crawl_limit", type: "int", default: 0 })
  webCrawlLimit!: number;

  @Column({ name: "pdf_upload_limit", type: "int", default: 0 })
  pdfUploadLimit!: number;

  @Column({ name: "image_upload_limit", type: "int", default: 0 })
  imageUploadLimit!: number;

  @Column({ name: "csv_upload_limit", type: "int", default: 0 })
  csvUploadLimit!: number;
}
