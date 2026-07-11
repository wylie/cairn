CREATE TYPE "public"."program_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."program_session_status" AS ENUM('scheduled', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."program_registration_status" AS ENUM('confirmed', 'waitlisted', 'cancelled', 'attended', 'absent');--> statement-breakpoint

CREATE TABLE "programs" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "facility_id" text,
  "name" text NOT NULL,
  "description" text,
  "category" text DEFAULT 'class' NOT NULL,
  "capacity" integer DEFAULT 0 NOT NULL,
  "minimum_age" integer,
  "maximum_age" integer,
  "status" "program_status" DEFAULT 'active' NOT NULL,
  "waitlist_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "programs_capacity_check" CHECK ("capacity" >= 0),
  CONSTRAINT "programs_age_range_check" CHECK ("minimum_age" IS NULL OR "maximum_age" IS NULL OR "minimum_age" <= "maximum_age")
);--> statement-breakpoint

CREATE TABLE "program_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "facility_id" text NOT NULL,
  "program_id" text NOT NULL,
  "title" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "instructor_staff_id" text,
  "instructor_name" text,
  "capacity" integer DEFAULT 0 NOT NULL,
  "status" "program_session_status" DEFAULT 'scheduled' NOT NULL,
  "waitlist_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "program_sessions_capacity_check" CHECK ("capacity" >= 0),
  CONSTRAINT "program_sessions_time_check" CHECK ("ends_at" > "starts_at")
);--> statement-breakpoint

CREATE TABLE "program_registrations" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "session_id" text NOT NULL,
  "customer_id" text NOT NULL,
  "status" "program_registration_status" DEFAULT 'confirmed' NOT NULL,
  "waitlist_position" integer,
  "attendance_status" text,
  "registered_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "program_registrations_waitlist_position_check" CHECK (
    ("status" = 'waitlisted' AND "waitlist_position" IS NOT NULL AND "waitlist_position" > 0)
    OR ("status" <> 'waitlisted')
  )
);--> statement-breakpoint

ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_instructor_staff_id_staff_users_id_fk" FOREIGN KEY ("instructor_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_registrations" ADD CONSTRAINT "program_registrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_registrations" ADD CONSTRAINT "program_registrations_session_id_program_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."program_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_registrations" ADD CONSTRAINT "program_registrations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "programs_organization_id_idx" ON "programs" ("organization_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "programs_facility_id_idx" ON "programs" ("organization_id", "facility_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_sessions_organization_starts_idx" ON "program_sessions" ("organization_id", "starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_sessions_program_idx" ON "program_sessions" ("organization_id", "program_id", "starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_sessions_facility_idx" ON "program_sessions" ("organization_id", "facility_id", "starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_registrations_session_status_idx" ON "program_registrations" ("organization_id", "session_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_registrations_customer_idx" ON "program_registrations" ("organization_id", "customer_id", "registered_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_registrations_waitlist_idx" ON "program_registrations" ("organization_id", "session_id", "waitlist_position")
  WHERE "status" = 'waitlisted';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "program_registrations_one_active_customer_session_idx"
  ON "program_registrations" ("organization_id", "session_id", "customer_id")
  WHERE "status" IN ('confirmed', 'waitlisted', 'attended', 'absent');
