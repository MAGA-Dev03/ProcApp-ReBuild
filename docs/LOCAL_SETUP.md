# Local Setup Guide

How to get the ProcApp backend and frontend running on your own machine, starting from
nothing. Written for QA engineers who are new to the project.

Everything here was checked against the code in this repository (September 2026). Where
something could not be confirmed from the code, this guide says so.

> **Read this first. There is no seed data.**
> The database migrations create the tables and exactly **one** role (`SYSTEM_ADMIN`).
> They do **not** create the other six roles, any user account, any projects, suppliers or
> invoices. There is no `V2__seed*.sql` or any other seed file in the repo (`V2` is the audit
> log table). So on a fresh database **nobody can log in** until you run the bootstrap SQL
> in [Step 6](#step-6--bootstrap-roles-and-your-first-admin-account). Plan for this.

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Repository layout](#repository-layout)
3. [Step 1: Get the code](#step-1--get-the-code)
4. [Step 2: Create an empty PostgreSQL database](#step-2--create-an-empty-postgresql-database)
5. [Step 3: Set the backend environment variables](#step-3--set-the-backend-environment-variables)
6. [Step 4: Start the backend (this applies the schema)](#step-4--start-the-backend-this-applies-the-schema)
7. [Step 5: What the migrations created](#step-5--what-the-migrations-created)
8. [Step 6: Bootstrap roles and your first admin account](#step-6--bootstrap-roles-and-your-first-admin-account)
9. [Step 7: Start the frontend](#step-7--start-the-frontend)
10. [Step 8: Confirm everything works](#step-8--confirm-everything-works)
11. [Optional: run the backend regression tests](#optional-run-the-backend-regression-tests)
12. [Common problems and fixes](#common-problems-and-fixes)

---

## Prerequisites

| Tool | Version | Where this comes from |
| --- | --- | --- |
| **Java JDK** | **17** | `<java.version>17</java.version>` in [`procapp-backend/pom.xml`](../procapp-backend/pom.xml). The last recorded test run used Eclipse Temurin 17.0.16. Newer JDKs will probably work but have not been tested. |
| **Maven** | **Not required** | The repo includes the Maven wrapper (`mvnw` / `mvnw.cmd`). On first run it downloads Maven 3.9.14 by itself (see [`.mvn/wrapper/maven-wrapper.properties`](../procapp-backend/.mvn/wrapper/maven-wrapper.properties)). You only need a JDK and an internet connection. |
| **Node.js** | **20.19+ or 22.12+** | The frontend uses Vite 8, which requires Node `^20.19.0 \|\| >=22.12.0`. The GitHub Actions build uses Node 20. The main developer machine runs Node 24.14. |
| **npm** | Comes with Node | Used for `npm install` / `npm run dev`. |
| **PostgreSQL** | **Not pinned. See note.** | No file in the repo states a required PostgreSQL version. The SQL in the migrations needs **9.6 or newer** (`ADD COLUMN IF NOT EXISTS`, `ON CONFLICT`). The main developer machine has **PostgreSQL 18** installed. **Recommendation:** use a currently supported release (14 or newer). 18 is the only version known to have been used. |
| **pgcrypto extension** | Ships with PostgreSQL | Only needed for the bootstrap SQL in Step 6, which uses it to hash a password. It is included in the standard PostgreSQL installers. |
| **Git** | Any recent | To clone the repo. |

You will also want a SQL client: `psql` (installed with PostgreSQL) or pgAdmin.

---

## Repository layout

The repository is a small monorepo. The backend and frontend sit **side by side** at the root.
One is not inside the other.

```
ProcApp-ReBuild/
├── README.md                    ← short overview + env var table
├── docs/                        ← you are here
├── procapp-backend/             ← Spring Boot API (Java 17, Maven wrapper)
│   ├── mvnw, mvnw.cmd
│   ├── .env.example             ← reference only, NOT loaded automatically (see Step 3)
│   └── src/main/resources/
│       ├── application.yml      ← all config, read from environment variables
│       └── db/migration/        ← Flyway SQL migrations V1–V6 (the schema)
└── procapp-frontend/            ← React + Vite app
    ├── package.json
    └── src/
```

All commands below must be run from **inside** the module folder (`procapp-backend` or
`procapp-frontend`), not the repo root.

---

## Step 1: Get the code

```bash
git clone <repo-url> ProcApp-ReBuild
cd ProcApp-ReBuild
```

Ask the team lead for the repository URL. It is not recorded in the repo.

---

## Step 2: Create an empty PostgreSQL database

The backend expects a database called **`procapp`** on **`localhost:5432`**, accessed as user
**`postgres`** (these are the defaults in `application.yml`; see Step 3 to change them).

Using `psql`:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE procapp;"
```

On Windows, `psql` is often not on the PATH. Use the full path instead, for example:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE procapp;"
```

Or in pgAdmin: right-click **Databases → Create → Database…**, name it `procapp`.

> **The database must be completely empty.** Do not create any tables in it by hand.
> The backend's Flyway config has `baseline-on-migrate: true` with `baseline-version: 5`.
> This exists for old databases that were built by hand before Flyway was turned on. If
> Flyway finds *any* existing tables and no Flyway history, it assumes the schema is
> already at V5, **skips V1–V5**, and runs only V6. The app then fails to start with
> Hibernate "missing table" errors. If that happens, drop the database and recreate it
> empty.

**Do not apply the SQL files by hand.** The backend applies them automatically when it
starts (Step 4). The schema files are in
[`procapp-backend/src/main/resources/db/migration/`](../procapp-backend/src/main/resources/db/migration/):

| File | What it does |
| --- | --- |
| `V1__init_schema.sql` | Creates `projects`, `suppliers`, `roles`, `users`, `user_roles`, `user_projects`, `invoices` and their indexes. |
| `V2__invoice_audit_log.sql` | Creates the append-only `invoice_audit_log` table. (This is **not** a seed file.) |
| `V3__system_admin_role.sql` | Inserts the single role `SYSTEM_ADMIN`. This is the only data any migration inserts. |
| `V4__finance_batch_numbering.sql` | Creates `finance_batches` and `finance_batch_sequence` (finance list-number generator). The back-fill statements do nothing on an empty database. |
| `V5__user_token_version.sql` | Adds `users.token_version` (used to revoke login sessions). |
| `V6__legacy_import_columns.sql` | Adds `legacy_id` / `created_at` / `updated_at` / `migrated_from_legacy` columns left by a one-off import from the old system. No application code reads them. |

---

## Step 3: Set the backend environment variables

The backend reads its settings from environment variables. They are referenced in
[`application.yml`](../procapp-backend/src/main/resources/application.yml):

| Variable | Required? | Default if not set | What to use locally |
| --- | --- | --- | --- |
| `DB_PASSWORD` | **Yes.** The app will not start without it. | *(none)* | The password of your local `postgres` user. |
| `JWT_SECRET` | **Yes.** The app will not start without it. | *(none)* | A random string of **at least 32 characters** (see below). |
| `DB_URL` | No | `jdbc:postgresql://localhost:5432/procapp` | Change only if your DB is elsewhere or named differently. |
| `DB_USERNAME` | No | `postgres` | Change if you use a different DB user. |
| `ATTACHMENTS_DIR` | No | `C:/procapp-data/attachments` | Folder where uploaded invoice attachments are saved. It is created automatically. **macOS/Linux users must set this**, e.g. `/tmp/procapp-attachments`, because the default is a Windows path. |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:5173` | The URL the frontend runs on. Leave as-is unless your frontend runs on a different port. |
| `SERVER_PORT` | No | `8080` | **Leave this at 8080.** The frontend is hard-coded to call `http://localhost:8080` (see [Common problems](#common-problems-and-fixes)). |

These are the only variables referenced in `application.yml`. Nothing else is read from the
environment.

### Rules for `JWT_SECRET`

- It must be **at least 32 characters** (32 bytes). The signing library rejects shorter keys at
  startup.
- It must **not** start with `changeme`. The app deliberately refuses to start with the
  placeholder value from `.env.example` (see
  [`JwtService.java:27`](../procapp-backend/src/main/java/lk/maga/procapp/security/JwtService.java#L27)).
- Generate one and **never commit it**. A real key was once leaked in this repo (commit
  `b4028d9`), so the team is strict about this.

Generate a secret:

```bash
# Git Bash / macOS / Linux
openssl rand -base64 64
```

```powershell
# Windows PowerShell (no openssl needed)
$b = New-Object byte[] 64; [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

### About `.env.example`

[`procapp-backend/.env.example`](../procapp-backend/.env.example) lists the two required
variables, but **Spring Boot does not read `.env` files**, and the project has no dotenv
library. Copying it to `.env` does nothing by itself. Use one of the methods below.

### Option A: set them in your terminal (simplest)

Set them in the **same terminal window** you will start the backend from.

PowerShell:

```powershell
$env:DB_PASSWORD = "your-local-postgres-password"
$env:JWT_SECRET  = "paste-the-generated-secret-here"
# macOS/Linux users only need this if not on Windows:
# $env:ATTACHMENTS_DIR = "C:/procapp-data/attachments"
```

Git Bash / macOS / Linux:

```bash
export DB_PASSWORD='your-local-postgres-password'
export JWT_SECRET='paste-the-generated-secret-here'
export ATTACHMENTS_DIR="$HOME/procapp-attachments"   # needed on macOS/Linux
```

These last only as long as that terminal is open.

### Option B: VS Code `launch.json`

The developers run the backend from VS Code with the variables in `.vscode/launch.json`
(commit `d07beae` and the comment at the top of
[`src/test/resources/application.yml`](../procapp-backend/src/test/resources/application.yml)
say so). **That file is not in the repository.** `.vscode/` is listed in `.gitignore` at the
root and in `procapp-backend/.gitignore`, so you have to create your own.

1. Install the **Extension Pack for Java** in VS Code.
2. Open the `procapp-backend` folder in VS Code.
3. Create `procapp-backend/.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "ProcApp Backend",
      "request": "launch",
      "mainClass": "lk.maga.procapp.ProcappBackendApplication",
      "projectName": "procapp-backend",
      "env": {
        "DB_PASSWORD": "your-local-postgres-password",
        "JWT_SECRET": "paste-the-generated-secret-here",
        "ATTACHMENTS_DIR": "C:/procapp-data/attachments"
      }
    }
  ]
}
```

4. Press **F5** (or Run → Start Debugging) and pick "ProcApp Backend".

This is a working template, not a copy of the developers' own file, which is not in the repo.
Because `.vscode/` is git-ignored, your secrets in this file will not be committed. Keep it
that way.

---

## Step 4: Start the backend (this applies the schema)

From the `procapp-backend` folder, in the terminal where you set the variables:

```powershell
# Windows (PowerShell or cmd)
cd procapp-backend
.\mvnw.cmd spring-boot:run
```

```bash
# Git Bash / macOS / Linux
cd procapp-backend
./mvnw spring-boot:run
```

- The first run downloads Maven and all dependencies, which takes a few minutes.
- On macOS/Linux, if you get `permission denied`, run `chmod +x mvnw` once.
- On startup Flyway applies **V1 → V6** to the empty database. In the log you should see lines
  like `Migrating schema "public" to version "1 - init schema"` … `"6 - legacy import columns"`,
  then `Tomcat started on port 8080`.
- The backend listens on **http://localhost:8080**. Everything is under `/api/...`.

Leave this terminal running.

---

## Step 5: What the migrations created

After the first successful start, the database contains:

| Table | Rows |
| --- | --- |
| `roles` | **1 row: `SYSTEM_ADMIN`** (from V3) |
| `users`, `user_roles`, `user_projects` | empty |
| `projects`, `suppliers`, `invoices` | empty |
| `invoice_audit_log`, `finance_batches`, `finance_batch_sequence` | empty |
| `flyway_schema_history` | 6 rows (V1–V6) |

**There is no default admin account and there are no default login credentials.** Also,
`SYSTEM_ADMIN` cannot be given to anyone through the app itself (the API refuses it, see
[`UserService.java:240`](../procapp-backend/src/main/java/lk/maga/procapp/service/UserService.java#L240)).
You have to create the first account directly in the database.

### What about the demo logins the frontend prints?

When you start the frontend (Step 7), the terminal prints a list of "Mock demo logins" such as
`anushka.perera@maga.lk` with a shared password. **These do not exist in the real backend.**
They come from an old in-memory mock
([`src/api/mock/testLogins.ts`](../procapp-frontend/src/api/mock/testLogins.ts)) that the app no
longer uses. The Vite config still prints them
([`vite.config.ts:8`](../procapp-frontend/vite.config.ts#L8)). Ignore them.

---

## Step 6: Bootstrap roles and your first admin account

Run this once against the `procapp` database (with `psql -U postgres -h localhost -d procapp`
or pgAdmin's Query Tool). **Replace the two placeholders** with an email and password
**you choose**. Use a made-up test address, never a real production account.

```sql
-- 1. Create the six roles the app checks for.
--    SYSTEM_ADMIN already exists (V3). Names must be UPPERCASE and spelled exactly
--    like this: the app matches them case-sensitively, so 'Admin' grants nothing.
INSERT INTO roles (name) VALUES
  ('ADMIN'),
  ('PROCUREMENT'),
  ('PROCUREMENT_MANAGER'),
  ('SENIOR_MANAGER'),
  ('REPORT_USER'),
  ('SITE_STORE_KEEPER')
ON CONFLICT ((LOWER(name))) DO NOTHING;

-- 2. Enable bcrypt hashing inside PostgreSQL (needed for step 3 only).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Create your bootstrap admin. Replace BOTH placeholders.
--    Pick a password of 8+ characters with at least one letter and one number
--    (the app enforces this when passwords are changed later).
INSERT INTO users (name, email, password_hash, all_projects, active)
VALUES (
  'QA Bootstrap Admin',
  'REPLACE_WITH_YOUR_TEST_EMAIL',
  crypt('REPLACE_WITH_YOUR_PASSWORD', gen_salt('bf', 10)),
  true,
  true
);

-- 4. Give that user the ADMIN role.
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u JOIN roles r ON r.name = 'ADMIN'
WHERE LOWER(u.email) = LOWER('REPLACE_WITH_YOUR_TEST_EMAIL');
```

Why this works: the backend stores passwords as bcrypt hashes (`BCryptPasswordEncoder` in
[`SecurityConfig.java`](../procapp-backend/src/main/java/lk/maga/procapp/config/SecurityConfig.java)).
pgcrypto's `crypt(..., gen_salt('bf'))` produces a standard `$2a$` bcrypt hash that Spring
accepts. `created_at` and `token_version` fill in their defaults.

> **Not tested end to end:** this SQL was written from the schema and the password-encoder
> config. It was **not run** against a live database while this guide was being written. If
> it fails, report the error so this guide can be corrected.
> If `CREATE EXTENSION` fails for permissions, run it as the `postgres` superuser. If
> pgcrypto is not available at all, generate a bcrypt hash some other way
> (e.g. `htpasswd -bnBC 10 "" yourpassword | tr -d ':\n'`) and paste the hash in place of
> the `crypt(...)` call.

You can now log in as this admin. Creating accounts for the other roles, and a
`SYSTEM_ADMIN` account, is covered in [QA_TEST_ACCOUNTS.md](QA_TEST_ACCOUNTS.md).

**Business data:** there is none. Log in as your admin and create at least one **project**
(Projects screen) and one **supplier** (Suppliers screen) before anyone can enter invoices.

---

## Step 7: Start the frontend

In a **new** terminal:

```bash
cd procapp-frontend
npm install
npm run dev
```

- `npm install` takes a few minutes the first time. (`npm ci` also works and installs exactly
  what `package-lock.json` lists.)
- Vite serves the app at **http://localhost:5173** (Vite's default port. `vite.config.ts` does
  not change it).
- Ignore the "Mock demo logins" printed in the terminal (see Step 5).
- The frontend has no `.env` file and needs no environment variables for local use. It always
  calls the backend at `http://localhost:8080`
  ([`src/api/http.ts:4`](../procapp-frontend/src/api/http.ts#L4)).

Other scripts in `package.json`: `npm run build` (type-check and production build),
`npm run lint`, `npm run preview`.

---

## Step 8: Confirm everything works

### 1. Backend is up and rejects anonymous requests

```bash
curl -i http://localhost:8080/api/projects
```

Expected: `HTTP/1.1 401` with body `{"message":"Authentication required","status":401}`.

### 2. Login works

PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"YOUR_TEST_EMAIL","password":"YOUR_PASSWORD"}'
```

Git Bash / macOS / Linux:

```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_TEST_EMAIL","password":"YOUR_PASSWORD"}'
```

Expected: HTTP 200 with a JSON body containing `token` (a long JWT string) and `user` (with
`id`, `name`, `email`, `roles: [{ "id": …, "name": "ADMIN" }]`, …).

A wrong password gives `401 {"message":"Invalid email or password",...}`. Five wrong attempts
in a row for the same email lock that email out for 10 minutes (`429`).

### 3. The frontend loads and you can sign in

1. Open **http://localhost:5173**. You are redirected to `/login`.
2. Sign in with your bootstrap admin.
3. You land on **Profile**. The sidebar shows **Projects**, **Suppliers** and **Users** (the
   ADMIN screens). If the sidebar is empty apart from Profile, the user has no recognised role.
   Check that step 4 of the bootstrap SQL ran and that the role name is exactly `ADMIN`.
4. Open **Users**. The list should load with your admin in it. If you get a browser
   console error mentioning **CORS**, see Common problems below.

---

## Optional: run the backend regression tests

```bash
cd procapp-backend
./mvnw test          # Windows: .\mvnw.cmd test
```

Things to know (from [`src/test/resources/application.yml`](../procapp-backend/src/test/resources/application.yml)):

- The tests run against **your real local `procapp` database** at `localhost:5432` as user
  `postgres`. The URL and username are hard-coded in the test config.
- `DB_PASSWORD` is read from the environment; if unset, the test config falls back to `dev03`
  (the main developer's local password). Set `DB_PASSWORD` if yours differs.
- The tests use their own fake JWT key and ignore `JWT_SECRET`.
- Each test runs in a transaction that is rolled back, so they do not leave data behind. (The
  concurrency test commits, but only to a private counter row that it deletes afterwards.)
- The tests **require the roles `ADMIN`, `PROCUREMENT`, `PROCUREMENT_MANAGER`,
  `SITE_STORE_KEEPER` and `SYSTEM_ADMIN` to already exist**. On a fresh database, run Step 6
  first, or the tests fail with `NoSuchElementException`.
- Flyway is disabled in tests. The schema must already be migrated (start the app once first).
- Last recorded run: 20 tests, 0 failures (19 in `SecurityCriticalTests`, 1 in
  `FinanceBatchNumberConcurrencyTests`).

There are no frontend automated tests in the repo.

---

## Common problems and fixes

These come from git history, code comments and reading the config. None of them are guesses
about your particular machine.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Backend fails at startup: `Could not resolve placeholder 'DB_PASSWORD'` (or `JWT_SECRET`) | The variable is not set in the environment the backend was started from. | Set it in the same terminal (Step 3, Option A) or in `launch.json`. Restart VS Code after changing system-wide env vars. |
| Backend fails: `JWT_SECRET is still the .env.example placeholder; generate a real key` | You copied the `changeme-…` value from `.env.example`. | Generate a real secret (Step 3). |
| Backend fails with a `WeakKeyException` mentioning key length | `JWT_SECRET` is shorter than 32 characters. | Use a longer secret; the generators in Step 3 give 88 characters. |
| You created a `.env` file but the variables are still missing | Spring Boot does not read `.env` files. | Use Option A or B in Step 3. |
| Backend fails with `Schema-validation: missing table [...]` | Flyway baselined a non-empty database at V5 and skipped V1–V5 (see Step 2), **or** the backend is pointed at the wrong database. | Drop and recreate `procapp` empty, then start again. Check `DB_URL`. |
| Backend fails with a Flyway **checksum mismatch** / "Validate failed" | A migration file was edited after it was applied. The README forbids this. | Don't edit existing migration files. For a local DB, drop and recreate it. |
| Backend fails: `Connection refused` / `password authentication failed` | PostgreSQL isn't running, or `DB_PASSWORD` / `DB_USERNAME` are wrong. | Start the PostgreSQL service; check the credentials with `psql`. |
| Backend fails: `Could not create attachments directory` | On macOS/Linux the Windows default `C:/procapp-data/attachments` can't be used as intended, or the folder isn't writable. | Set `ATTACHMENTS_DIR` to a writable folder. |
| Browser console: **CORS** error, all API calls fail | The frontend is not on exactly `http://localhost:5173`. Common causes: Vite moved to port **5174** because 5173 was busy, or you opened `http://127.0.0.1:5173`. | Free port 5173 and restart `npm run dev`, use `localhost` (not `127.0.0.1`), or set `CORS_ALLOWED_ORIGINS` to the URL you are using and restart the backend. |
| Frontend can't reach the backend after changing `SERVER_PORT` | The frontend's API address is hard-coded to `http://localhost:8080` in `src/api/http.ts`. | Keep the backend on 8080. |
| Login fails with the "demo logins" printed by Vite | Those accounts only existed in an old mock. | Use the account you created in Step 6. |
| Login returns **429 Too many failed login attempts** | 5 consecutive failures for that email → 10-minute lockout ([`LoginAttemptService.java:20`](../procapp-backend/src/main/java/lk/maga/procapp/security/LoginAttemptService.java#L20)). | Wait 10 minutes, or restart the backend (the counter is kept in memory only). |
| You are suddenly sent back to the login page | Expected after your password, roles or active status change, or after logout elsewhere: the server revokes all of that user's tokens immediately. Tokens also expire after 10 hours. | Log in again. |
| After login the sidebar shows only "Profile" | The user has no role, or only a custom role / wrongly-cased role name. | Assign one of the seven exact role names (see [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)). |
| `./mvnw: Permission denied` (macOS/Linux) | Execute bit missing. | `chmod +x mvnw` |
| `psql: command not found` (Windows) | PostgreSQL's `bin` folder is not on PATH. | Use the full path, e.g. `"C:\Program Files\PostgreSQL\18\bin\psql.exe"`, or pgAdmin. |
| `npm run dev` fails with a Node version error | Node is older than 20.19. | Install Node 20.19+ or 22.12+. |
| Attachment upload fails for a large file | Upload limit is 10 MB (`spring.servlet.multipart.max-file-size`). Only real PDF, JPEG and PNG files are accepted (checked by file content, not extension). | Use a smaller file of an allowed type. |
| Backend tests fail with `NoSuchElementException` | The required roles don't exist in your local DB. | Run the Step 6 SQL. |

If you hit something not listed here, note the exact error message and add it to this table.
