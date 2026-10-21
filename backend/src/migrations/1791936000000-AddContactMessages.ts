import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactMessages1791936000000 implements MigrationInterface {
  name = 'AddContactMessages1791936000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.contact_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        email VARCHAR(254) NOT NULL,
        subject VARCHAR(200),
        message TEXT NOT NULL
          CHECK (char_length(message) BETWEEN 1 AND 5000),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contact_messages_createdAt_id"
      ON public.contact_messages ("createdAt" DESC, id DESC)
    `);
    await queryRunner.query(`
      ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public.contact_messages');
  }
}
