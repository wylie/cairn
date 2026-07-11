ALTER TABLE "customers"
  ADD CONSTRAINT "customers_household_id_households_id_fk"
  FOREIGN KEY ("household_id")
  REFERENCES "public"."households"("id")
  ON DELETE set null
  ON UPDATE no action;
