-- SYSTEM_ADMIN: developer-only role with full system access, and the only
-- role permitted to view the invoice audit log. Not assignable through the
-- regular Add User form (see UserService.resolveRoles).

INSERT INTO roles (name)
VALUES ('SYSTEM_ADMIN')
ON CONFLICT ((LOWER(name))) DO NOTHING;
