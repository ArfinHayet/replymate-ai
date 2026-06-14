import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCsvIngestion1718358000000 implements MigrationInterface {
  name = 'AddCsvIngestion1718358000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. csvs ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "csvs" (
        "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
        "userId"     UUID,
        "fileName"   TEXT          NOT NULL,
        "rowCount"   INT           NOT NULL DEFAULT 0,
        "headers"    TEXT[]        NOT NULL DEFAULT '{}',
        "createdAt"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_csvs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_csvs_userId" ON "csvs" ("userId")
    `);

    // ── 2. csv_chunks ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "csv_chunks" (
        "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
        "userId"      UUID,
        "csvId"       UUID,
        "content"     TEXT        NOT NULL,
        "fileName"    TEXT        NOT NULL,
        "chunkIndex"  INT         NOT NULL,
        "embedding"   TEXT        NOT NULL,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_csv_chunks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_csv_chunks_csvId"
          FOREIGN KEY ("csvId") REFERENCES "csvs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_csv_chunks_userId" ON "csv_chunks" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_csv_chunks_csvId" ON "csv_chunks" ("csvId")
    `);

    // ── 3. plan: add csv_upload_limit ────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "plan"
        ADD COLUMN IF NOT EXISTS "csv_upload_limit" INT NOT NULL DEFAULT 0
    `);

    // ── 4. Seed limits for existing plans ────────────────────────────────────
    await queryRunner.query(`
      UPDATE "plan" SET "csv_upload_limit" = 5  WHERE id = 1 AND "csv_upload_limit" = 0
    `);
    await queryRunner.query(`
      UPDATE "plan" SET "csv_upload_limit" = 50 WHERE id = 2 AND "csv_upload_limit" = 0
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plan" DROP COLUMN IF EXISTS "csv_upload_limit"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "csv_chunks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "csvs"`);
  }
}
