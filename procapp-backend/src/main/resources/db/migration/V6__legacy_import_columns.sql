-- Columns added by the one-off import from the legacy system
-- (procapp_migration.sql). That script was run by hand in pgAdmin and never
-- committed, so until now nothing in the repo created these columns and a
-- database rebuilt from V1-V5 did not match the live one.
--
-- Only the schema side is captured here. The import itself copied legacy
-- data and was a one-time operation; it is not meant to be re-run.
-- legacy_id holds the row's id in the legacy system, for tracing imported
-- rows back to their source. No application code reads these columns.
--
-- IF NOT EXISTS: databases built before Flyway was enabled already have
-- these columns (they are baselined at V5, so this runs as a no-op there).

ALTER TABLE projects ADD COLUMN IF NOT EXISTS legacy_id BIGINT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS legacy_status_raw INT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS legacy_id BIGINT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_id BIGINT;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS legacy_id BIGINT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS migrated_from_legacy BOOLEAN NOT NULL DEFAULT false;
