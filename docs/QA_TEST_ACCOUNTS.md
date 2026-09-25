# QA Test Accounts

How to create your own test accounts for every role on your **local** ProcApp.

> ## ⚠️ Never use production credentials or production data
>
> - Do **not** log in to a local or test environment with a real person's production account,
>   and do not copy production passwords, password hashes or JWT secrets anywhere.
> - Do **not** load a production database dump into your local database. Invoices contain
>   supplier names, amounts and scanned documents.
> - Use made-up names and addresses on a reserved test domain such as `@procapp.test`
>   (`.test` can never be a real email domain).
> - Choose your own passwords. **No shared default passwords are published anywhere in this
>   repo**, and the "Mock demo logins" printed by the frontend dev server are left over from an
>   old mock and **do not work** against the real backend.

---

## Before you start

1. Follow [LOCAL_SETUP.md](LOCAL_SETUP.md) up to and including
   **Step 6 (bootstrap roles and your first admin account)**. On a fresh database:
   - the migrations create only the `SYSTEM_ADMIN` role;
   - Step 6 creates the other six roles and one `ADMIN` account that **you** chose the
     email and password for.
2. Sign in to the frontend (http://localhost:5173) as that bootstrap admin.

Everything below builds on that one account.

---

## Recommended QA account set

One account per role, plus a few variants that exercise edge cases. The emails are a suggested
naming pattern; you pick the passwords.

| Suggested email | Role(s) | Projects | Why you need it |
| --- | --- | --- | --- |
| *(your bootstrap admin)* | `ADMIN` | All projects | Manage projects, suppliers, users. |
| `qa.sysadmin@procapp.test` | `SYSTEM_ADMIN` | All projects | Only role that can open the Audit Log. **Must be created with SQL** (see below). |
| `qa.procurement@procapp.test` | `PROCUREMENT` | (not used) | Invoice entry without manager powers. Checks that cancel/activate and remarks are blocked. |
| `qa.procmanager@procapp.test` | `PROCUREMENT_MANAGER` | (not used) | Cancel, reactivate, remarks. |
| `qa.senior@procapp.test` | `SENIOR_MANAGER` | (not used) | Dashboard + Invoice Report. |
| `qa.report@procapp.test` | `REPORT_USER` | (not used) | Invoice Report only (read + export). |
| `qa.keeper.scoped@procapp.test` | `SITE_STORE_KEEPER` | **One** specific project (e.g. "QA Project A") | Row-level scoping: must see only that project's invoices. |
| `qa.keeper.all@procapp.test` | `SITE_STORE_KEEPER` | **All projects** ticked | Unscoped keeper. |
| `qa.keeper.none@procapp.test` | `SITE_STORE_KEEPER` | None, "All projects" unticked | Must see **no** invoices at all. |
| `qa.custom@procapp.test` | A custom role you create (e.g. `QA_CUSTOM_ROLE`) | (not used) | Custom roles must grant nothing (only the Profile screen). |
| `qa.norole@procapp.test` | none | (not used) | Can log in, sees only Profile; can still read project/supplier lists via API. |
| `qa.multi@procapp.test` | `PROCUREMENT` + `REPORT_USER` | (not used) | Permissions of several roles combine. |

"Projects" on a user account **only affects `SITE_STORE_KEEPER`**. For every other role the
setting is stored but ignored; they see invoices for all projects.

---

## Step 1: Create some basic data first

The database starts with no projects or suppliers, and invoices can't be created without them.
As your bootstrap admin:

1. **Projects** screen → create at least two, e.g. code `QA-A` / name "QA Project A" and
   `QA-B` / "QA Project B" (status *Working*). Project codes must be unique (case-insensitive).
2. **Suppliers** screen → create at least one, e.g. business partner code `QA-SUP-1`,
   name "QA Supplier One". Business partner code is required and unique; email is optional but
   must be unique if given.

You need two projects to test site-keeper scoping properly.

---

## Step 2: Create accounts through the Users screen (all roles except SYSTEM_ADMIN)

Signed in as your bootstrap admin:

1. Go to **Users** → add a new user.
2. Fill in:
   - **Name**: anything.
   - **Email**: from the table above. This is the login name, must be a valid email format,
     and must be unique (case-insensitive).
   - **Password / Confirm password**: your choice. The server requires **at least 8
     characters with at least one letter and one number**. The form only checks the length,
     so a password like `abcdefgh` passes the form but is rejected by the server.
   - **Roles**: pick from the list. `SYSTEM_ADMIN` is intentionally not in the list.
   - **All projects** / **Projects**: only matters for site keepers (see table).
   - **Active**: leave ticked.
3. Save.

To create the **custom role** for `qa.custom@…`: in the user form, use **"Add new role"**, type a
name (e.g. `QA_CUSTOM_ROLE`), then select it.

The same thing through the API (as admin, with your admin's token):

```bash
# 1. Find role and project IDs
curl -s http://localhost:8080/api/roles    -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8080/api/projects -H "Authorization: Bearer $TOKEN"

# 2. Create a user
curl -s -X POST http://localhost:8080/api/users \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"QA Procurement","email":"qa.procurement@procapp.test",
       "password":"<your choice>","roleIds":[<PROCUREMENT id>],
       "allProjects":false,"projectIds":[]}'
```

---

## Step 3: Create the SYSTEM_ADMIN account (SQL only)

The app deliberately refuses to assign `SYSTEM_ADMIN` through the API or the Users screen
([`UserService.java:240`](../procapp-backend/src/main/java/lk/maga/procapp/service/UserService.java#L240)).
The easiest way:

1. Create `qa.sysadmin@procapp.test` on the Users screen with **no roles** (or just `ADMIN`) and a
   password you choose.
2. Grant `SYSTEM_ADMIN` in the database:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u JOIN roles r ON r.name = 'SYSTEM_ADMIN'
WHERE LOWER(u.email) = LOWER('qa.sysadmin@procapp.test');
```

3. If that user was already logged in, have them log out and back in.

> **Don't edit a SYSTEM_ADMIN user on the Users screen afterwards.** The form hides
> `SYSTEM_ADMIN` from the role picker but still sends the user's existing role IDs on save,
> and the server rejects any request that includes `SYSTEM_ADMIN`. So editing that user through
> the UI will probably fail with a validation error. (This was worked out from the code and has
> not been tried; see [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).) Make changes to that
> account in SQL instead.

---

## Alternative: create any account entirely in SQL

Useful for scripting a fresh environment. This uses the same approach as the bootstrap in
[LOCAL_SETUP.md Step 6](LOCAL_SETUP.md#step-6--bootstrap-roles-and-your-first-admin-account)
(requires the `pgcrypto` extension created there). Replace the placeholders.

```sql
-- One user
INSERT INTO users (name, email, password_hash, all_projects, active)
VALUES ('QA Site Keeper (scoped)', 'qa.keeper.scoped@procapp.test',
        crypt('<your chosen password>', gen_salt('bf', 10)),
        false, true);

-- Give them a role (exact uppercase name)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'SITE_STORE_KEEPER'
WHERE LOWER(u.email) = LOWER('qa.keeper.scoped@procapp.test');

-- Assign one project (only meaningful for SITE_STORE_KEEPER)
INSERT INTO user_projects (user_id, project_id)
SELECT u.id, p.id FROM users u JOIN projects p ON LOWER(p.code) = LOWER('QA-A')
WHERE LOWER(u.email) = LOWER('qa.keeper.scoped@procapp.test');
```

Notes:

- SQL skips the app's password-strength check, so pick a compliant password anyway (8+ chars,
  a letter and a digit). Otherwise the user can't re-save the same password later.
- Role names must match exactly (`ADMIN`, `SYSTEM_ADMIN`, `PROCUREMENT`, `PROCUREMENT_MANAGER`,
  `SENIOR_MANAGER`, `REPORT_USER`, `SITE_STORE_KEEPER`). `Admin` or `admin` grants nothing.
- Changes to roles or `active` made directly in SQL take effect on the user's **next request**
  (the backend re-reads the user each time), but they do not bump `token_version`. Changes
  made through the app do.
- This SQL has not been run against a live database (same caveat as the bootstrap).

---

## Looking after the accounts

| Situation | What to do |
| --- | --- |
| Forgot a test user's password | As admin, edit the user and type a new password (leave blank to keep the old one). This also signs that user out everywhere. |
| "Too many failed login attempts" (429) | 5 wrong passwords lock that email for 10 minutes. Wait, or restart the backend (the lockout is kept in memory). |
| Need to disable an account | Edit the user → untick **Active**. Their session ends immediately. Inactive users get the same "Invalid email or password" message as a wrong password, by design. |
| Want to delete a user | Only possible if they never created an invoice. Otherwise you get `409` "Consider deactivating instead". |
| Your own password | Use the **Profile** screen. You will be signed out and must log in again. |
| Start completely fresh | Stop the backend, drop and recreate the `procapp` database, start the backend (migrations re-run), then repeat the bootstrap and this guide. Consider also emptying the attachments folder (`ATTACHMENTS_DIR`). |

---

## Quick smoke test per account

Log in as each account and check the sidebar matches:

| Account | Sidebar should show |
| --- | --- |
| ADMIN | Projects, Suppliers, Users |
| SYSTEM_ADMIN | Projects, Suppliers, Users, Audit Log |
| PROCUREMENT / PROCUREMENT_MANAGER | Invoices, Submitted Invoices, Add to Finance, Invoice Report |
| SENIOR_MANAGER | Dashboard, Invoice Report |
| REPORT_USER | Invoice Report |
| SITE_STORE_KEEPER (any variant) | Site Store Keeper |
| Custom role / no role | Nothing except Profile (via the user menu) |

The full permission rules are in [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md#api-permissions-from-the-preauthorize-annotations).
