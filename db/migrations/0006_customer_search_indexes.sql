CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "customers_organization_id_idx"
  ON "customers" ("organization_id");

CREATE INDEX IF NOT EXISTS "customers_first_name_trgm_idx"
  ON "customers" USING gin ("first_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "customers_last_name_trgm_idx"
  ON "customers" USING gin ("last_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "customers_preferred_name_trgm_idx"
  ON "customers" USING gin ("preferred_name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "customers_email_trgm_idx"
  ON "customers" USING gin ("email" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "customers_phone_trgm_idx"
  ON "customers" USING gin ("phone" gin_trgm_ops);
