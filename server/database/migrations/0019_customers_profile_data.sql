ALTER TABLE "customers"
ADD COLUMN "profile_data" jsonb DEFAULT '{}'::jsonb NOT NULL;
