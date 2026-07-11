CREATE TYPE "public"."membership_owner_type" AS ENUM('customer', 'household');--> statement-breakpoint
CREATE TYPE "public"."membership_plan_kind" AS ENUM('individual', 'household', 'staff');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'expired', 'cancelled', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."check_in_access_status" AS ENUM('approved', 'denied', 'override');--> statement-breakpoint
CREATE TYPE "public"."check_in_status" AS ENUM('checked-in', 'checked-out');--> statement-breakpoint

CREATE TABLE "membership_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "facility_id" text,
  "name" text NOT NULL,
  "kind" "membership_plan_kind" DEFAULT 'individual' NOT NULL,
  "duration_days" integer DEFAULT 30 NOT NULL,
  "price_cents" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "memberships" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "facility_id" text,
  "plan_id" text NOT NULL,
  "owner_type" "membership_owner_type" NOT NULL,
  "customer_id" text,
  "household_id" text,
  "status" "membership_status" DEFAULT 'active' NOT NULL,
  "starts_on" date NOT NULL,
  "expires_on" date,
  "cancelled_at" timestamp with time zone,
  "suspended_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "memberships_owner_target_check" CHECK (
    ("owner_type" = 'customer' AND "customer_id" IS NOT NULL AND "household_id" IS NULL)
    OR ("owner_type" = 'household' AND "household_id" IS NOT NULL)
  )
);--> statement-breakpoint

CREATE TABLE "check_ins" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "facility_id" text NOT NULL,
  "customer_id" text NOT NULL,
  "membership_id" text,
  "checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
  "checked_out_at" timestamp with time zone,
  "status" "check_in_status" DEFAULT 'checked-in' NOT NULL,
  "access_status" "check_in_access_status" DEFAULT 'approved' NOT NULL,
  "denial_reason" text,
  "checked_in_by_staff_id" text,
  "checked_in_by_staff_name" text,
  "checked_out_by_staff_id" text,
  "checked_out_by_staff_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_checked_in_by_staff_id_staff_users_id_fk" FOREIGN KEY ("checked_in_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_checked_out_by_staff_id_staff_users_id_fk" FOREIGN KEY ("checked_out_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "membership_plans_organization_id_idx" ON "membership_plans" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_organization_id_idx" ON "memberships" ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_customer_id_idx" ON "memberships" ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_household_id_idx" ON "memberships" ("household_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_status_idx" ON "memberships" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "check_ins_organization_id_checked_in_at_idx" ON "check_ins" ("organization_id", "checked_in_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "check_ins_facility_id_checked_in_at_idx" ON "check_ins" ("facility_id", "checked_in_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "check_ins_one_active_customer_per_org_idx"
  ON "check_ins" ("organization_id", "customer_id")
  WHERE "checked_out_at" IS NULL;
