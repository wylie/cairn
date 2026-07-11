CREATE INDEX IF NOT EXISTS "memberships_access_customer_idx"
  ON "memberships" ("organization_id", "customer_id", "status", "starts_on", "expires_on")
  WHERE "customer_id" IS NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "memberships_access_household_idx"
  ON "memberships" ("organization_id", "household_id", "status", "starts_on", "expires_on")
  WHERE "household_id" IS NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "memberships_access_facility_idx"
  ON "memberships" ("organization_id", "facility_id", "status", "starts_on", "expires_on");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "check_ins_customer_history_idx"
  ON "check_ins" ("organization_id", "customer_id", "checked_in_at" DESC);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "check_ins_active_facility_idx"
  ON "check_ins" ("organization_id", "facility_id", "checked_in_at")
  WHERE "checked_out_at" IS NULL;
