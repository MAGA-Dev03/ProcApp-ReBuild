-- Test-only seed, used by CI (see .github/workflows/ci.yml). The real
-- migrations create only SYSTEM_ADMIN (V3); SecurityCriticalTests looks up the
-- other six roles by name, so a fresh database needs them. Same statement as
-- the bootstrap SQL in docs/LOCAL_SETUP.md Step 6. Never shipped with the app.

INSERT INTO roles (name) VALUES
  ('ADMIN'),
  ('PROCUREMENT'),
  ('PROCUREMENT_MANAGER'),
  ('SENIOR_MANAGER'),
  ('REPORT_USER'),
  ('SITE_STORE_KEEPER')
ON CONFLICT ((LOWER(name))) DO NOTHING;
