# System Overview (for QA)

What ProcApp does, how it is built, who can do what, and which business rules are highest-risk
if they regress. Everything here was taken from the code (September 2026), not from older
documentation. Where this file and [`api-contract.md`](api-contract.md) disagree, **this file
matches the code**. The contract has drifted in a few places (listed in
[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)).

---

## What ProcApp does

ProcApp is an internal procurement tool for tracking **supplier invoices** from the moment they
arrive until they are handed to the finance department for payment. Procurement staff record
each invoice against a **project** and a **supplier**, attach a scan of it, and record the
**GRN** (Goods Received Note) once the goods have arrived. When invoices are ready, they select a
group of them and **"Add to Finance"**. That stamps the whole group with one shared finance
**List No** (e.g. `2026/09/25/003`) and date, and produces a printable finance report. A
Procurement Manager can cancel or reactivate invoices and add remarks. Site store keepers see
the invoices (and attachments) for the projects they are assigned to. Senior managers get a
dashboard of outstanding value and ageing. Report users can search and export invoice data.
Admins maintain projects, suppliers and user accounts. A developer-level System Admin can read
a full audit trail of every invoice change.

---

## Architecture

| Layer | Technology (from `package.json` / `pom.xml`) |
| --- | --- |
| **Frontend** | React 18 + TypeScript 6, built with **Vite 8**. Routing: `react-router-dom` 7. Data fetching/caching: TanStack Query 5. Tables: TanStack Table 8. Forms: `react-hook-form` + `zod` validation. UI: Tailwind CSS 4 + shadcn/Radix components. Charts: Recharts. Exports: `jspdf` + `jspdf-autotable` (PDF), SheetJS `xlsx` (Excel), plus CSV/print/copy generated in the browser. |
| **Backend** | Java 17, **Spring Boot 3.5.16**: Spring Web (REST), Spring Data JPA (Hibernate 6.6), Spring Security 6.5 with method security (`@PreAuthorize`), Bean Validation, Lombok. |
| **Database** | **PostgreSQL**. Schema is managed by **Flyway** migrations (`V1`–`V6`), applied automatically at startup. Hibernate runs in `validate` mode and never changes the schema. |
| **Auth** | Email + password login → backend issues a **JWT** (HS256, signed with `JWT_SECRET`, valid **10 hours**). The frontend sends it as `Authorization: Bearer …` on every call. Passwords are stored as **bcrypt** hashes. Sessions are stateless, but every request re-reads the user from the DB. A per-user `token_version` lets the server revoke tokens instantly on logout, password change, role change or deactivation. The frontend keeps the token in `localStorage` ("Remember me" ticked) or `sessionStorage` (not ticked). |
| **File storage** | Invoice attachments are saved to a folder on the backend's disk (`ATTACHMENTS_DIR`) under random UUID file names. Only PDF, JPEG and PNG are accepted, checked by the file's actual bytes. Max 10 MB. |
| **Hosting** | Local: backend on `:8080`, frontend on `:5173`. A GitHub Actions workflow publishes the frontend to GitHub Pages on pushes to `main`, but that build still points at `http://localhost:8080` (see Known Limitations). No production deployment config is in the repo. |

API responses: lists come back as `{ content, page, size, totalElements, totalPages }`. Errors
come back as `{ message, status, fieldErrors }`. Validation errors use HTTP **422** with a
`fieldErrors` map, state conflicts use **409**, missing records **404**, wrong role **403**, not
logged in **401**, and login lockout **429**.

---

## Roles

There are seven role names that mean something to the code
([`RoleNames.java`](../procapp-backend/src/main/java/lk/maga/procapp/security/RoleNames.java)).
A user can hold several roles at once; their permissions are the **union** of those roles.

| Role | Intended user |
| --- | --- |
| `PROCUREMENT` | Procurement officer. Enters and maintains invoices, records GRNs, batches to finance. |
| `PROCUREMENT_MANAGER` | Everything `PROCUREMENT` can do, **plus** cancel/reactivate invoices and write remarks. (There is no automatic inheritance. The permission checks simply list both roles where both apply.) |
| `REPORT_USER` | Read-only invoice reporting and exports. |
| `SENIOR_MANAGER` | Dashboard + invoice reporting. |
| `SITE_STORE_KEEPER` | Sees invoices only for their assigned projects; can open attachments. |
| `ADMIN` | Maintains projects, suppliers, users and roles. **No invoice access at all.** |
| `SYSTEM_ADMIN` | Developer-only. Same admin screens as `ADMIN`, **plus** the only role that can read the invoice audit log. Cannot be assigned through the app. It has to be granted in the database. |

Important facts for testing:

- **There is no role hierarchy.** `SYSTEM_ADMIN` is described in
  [`V3__system_admin_role.sql`](../procapp-backend/src/main/resources/db/migration/V3__system_admin_role.sql)
  as having "full system access". **The code does not give it that.** A user with only
  `SYSTEM_ADMIN` gets `403` on invoices, the dashboard and the site-keeper endpoints.
- **Role names are case-sensitive** in the permission checks (`hasRole('ADMIN')`). Admins can
  create extra roles on the Users screen ("Add new role"). A custom role, or a differently-cased
  name like `Admin`, **grants nothing**. This is intentional and covered by a regression test.
- A user with no recognised role can still log in, see their Profile, and read the project and
  supplier lists (those two read endpoints are open to any logged-in user).

---

## API permissions (from the `@PreAuthorize` annotations)

These are read directly from every controller. Where a method has its own `@PreAuthorize`, it
**replaces** the class-level one (Spring Security's rule), which is why the invoice list is
wider than the rest of `/api/invoices`.

✅ = allowed · — = `403 Forbidden` · 🔓 = any logged-in user

| API area | Endpoints | PROC | PROC_MGR | REPORT | SENIOR_MGR | SITE_KEEPER | ADMIN | SYS_ADMIN |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Login | `POST /api/auth/login` | public | public | public | public | public | public | public |
| Logout | `POST /api/auth/logout` | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Own profile | `PUT /api/users/me` | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| **Invoice search** | `GET /api/invoices`, `GET /api/invoices/list-numbers` | ✅ | ✅ | ✅ | ✅ | — | — | — |
| **Invoice work** | `GET /api/invoices/{id}`, `POST /api/invoices`, `PUT /api/invoices/{id}`, `DELETE /api/invoices/{id}`, `GET …/check-duplicate`, `POST …/{id}/grn`, `POST …/{id}/attachment`, `GET …/{id}/attachment`, `POST …/{id}/attachment-viewed`, `POST …/{id}/clear-finance-submission`, `POST …/batch-add-to-finance` | ✅ | ✅ | — | — | — | — | — |
| **Invoice cancel / reactivate** | `POST /api/invoices/{id}/cancel`, `POST /api/invoices/{id}/activate` | — | ✅ | — | — | — | — | — |
| **Site keeper** | `GET /api/site-keeper/invoices`, `GET …/invoices/{id}/attachment`, `POST …/invoices/{id}/attachment-viewed` | — | — | — | — | ✅ *(own projects only)* | — | — |
| **Dashboard** | `GET /api/dashboard/*` (summary, aging-buckets, aging-buckets/breakdown, top-suppliers, received-vs-submitted-trend, monthly-volume, cycle-time, recent-finance-batches) | — | — | — | ✅ | — | — | — |
| **Audit log** | `GET /api/audit-log/invoices` | — | — | — | — | — | — | ✅ |
| Projects: read | `GET /api/projects`, `GET /api/projects/{id}` | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Projects: write | `POST`, `PUT /{id}`, `DELETE /{id}`, `GET /{id}/delete-impact` | — | — | — | — | — | ✅ | ✅ |
| Suppliers: read | `GET /api/suppliers`, `GET /api/suppliers/{id}` | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Suppliers: write | `POST`, `PUT /{id}`, `DELETE /{id}` | — | — | — | — | — | ✅ | ✅ |
| Users | `GET /api/users`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}` | — | — | — | — | — | ✅ | ✅ |
| Roles | `GET /api/roles`, `POST /api/roles` | — | — | — | — | — | ✅ | ✅ |

Source annotations:
[`InvoiceController.java`](../procapp-backend/src/main/java/lk/maga/procapp/controller/InvoiceController.java)
(class L27, list L39, list-numbers L74, cancel L121, activate L128) ·
[`SiteKeeperController.java:20`](../procapp-backend/src/main/java/lk/maga/procapp/controller/SiteKeeperController.java#L20) ·
[`DashboardController.java:16`](../procapp-backend/src/main/java/lk/maga/procapp/controller/DashboardController.java#L16) ·
[`AuditLogController.java:17`](../procapp-backend/src/main/java/lk/maga/procapp/controller/AuditLogController.java#L17) ·
[`ProjectController.java`](../procapp-backend/src/main/java/lk/maga/procapp/controller/ProjectController.java) (L41–61) ·
[`SupplierController.java`](../procapp-backend/src/main/java/lk/maga/procapp/controller/SupplierController.java) (L39–52) ·
[`UserController.java`](../procapp-backend/src/main/java/lk/maga/procapp/controller/UserController.java) (L29–57; `/me` has none by design) ·
[`RoleController.java`](../procapp-backend/src/main/java/lk/maga/procapp/controller/RoleController.java) (L26, L32) ·
[`AuthController.java`](../procapp-backend/src/main/java/lk/maga/procapp/controller/AuthController.java) (login is `permitAll` in `SecurityConfig`; logout just needs a valid token).

Extra rules enforced **inside** the services (not visible in the annotations):

- **Remarks** on an invoice can only be set or changed by `PROCUREMENT_MANAGER`. Anyone else gets
  `422` on `remarks` ([`InvoiceService.java:118`](../procapp-backend/src/main/java/lk/maga/procapp/service/InvoiceService.java#L118), [`:180`](../procapp-backend/src/main/java/lk/maga/procapp/service/InvoiceService.java#L180)).
- **Site keepers** only see invoices on projects assigned to them, unless their account has
  "All projects" ticked. Asking for an invoice outside their projects returns **404** (not 403),
  so the ID can't be probed.
- **`SYSTEM_ADMIN` can't be assigned** via `POST/PUT /api/users` (`422`), not even by another
  SYSTEM_ADMIN.
- **Project assignment only matters for site keepers.** Procurement, report and manager users
  see invoices for **all** projects regardless of the projects on their account.

---

## Screens (frontend routes)

Route gating comes from [`src/routes/navConfig.ts`](../procapp-frontend/src/routes/navConfig.ts),
which drives both the sidebar and the route guards. If you open a screen's URL without the
right role, you get "You don't have permission to view this page". The backend enforces the same
rules independently.

| URL | Screen | Roles that see it | What it's for |
| --- | --- | --- | --- |
| `/login` | Login | Everyone (not logged in) | Email + password, optional "Remember me". |
| `/` | (redirect) | Logged in | Sends you to `/profile`. |
| `/profile` | Profile | Any logged-in user | Change your own name and password. A password change signs you out everywhere. |
| `/dashboard` | Dashboard | SENIOR_MANAGER | Outstanding value, GRN-pending and ready-to-submit counts, value submitted this month, aging buckets (with drill-down by supplier/project), top suppliers, received-vs-submitted trend, monthly volume, cycle time, recent finance batches. |
| `/invoices` | Invoices | PROCUREMENT, PROCUREMENT_MANAGER | Add/edit invoices (not yet submitted to finance), upload attachment, add GRN, delete, and (manager only) cancel/activate. |
| `/invoices/submitted` | Submitted Invoices | PROCUREMENT, PROCUREMENT_MANAGER | Invoices that carry a finance List No. Read-only edit dialog with a "Clear from finance list" action; (manager) cancel/activate. |
| `/invoices/add-to-finance` | Add to Finance | PROCUREMENT, PROCUREMENT_MANAGER | Pick active, not-yet-submitted invoices into a batch and submit them together under one new List No. |
| `/invoices/report` | Invoice Report | PROCUREMENT, PROCUREMENT_MANAGER, REPORT_USER, SENIOR_MANAGER | Filterable list of every invoice; export to copy/CSV/Excel/print; "Generate Finance Report" (PDF) for a List No. |
| `/site-keeper` | Site Store Keeper | SITE_STORE_KEEPER | Invoices for your assigned projects; open attachments (marks them "viewed"); export. |
| `/projects` | Projects | ADMIN, SYSTEM_ADMIN | Create/edit/delete projects. Delete warns how many invoices will be deleted with it. |
| `/suppliers` | Suppliers | ADMIN, SYSTEM_ADMIN | Create/edit/delete suppliers (blocked if any invoice uses the supplier). |
| `/users` | Users | ADMIN, SYSTEM_ADMIN | Create/edit/delete users, assign roles and projects, add new role names. `SYSTEM_ADMIN` is hidden from the role picker. |
| `/audit-log` | Audit Log | SYSTEM_ADMIN | Every invoice change: who, when, before/after data. Filter by invoice, action, user, text, dates. |
| `/style-guide` | Style Guide | Any logged-in user (not in the sidebar) | Developer page showing UI components with sample data. Not a product feature. |

---

## Invoice status model

The status is **calculated, never stored**. The backend computes it in
[`InvoiceStatusService.java`](../procapp-backend/src/main/java/lk/maga/procapp/service/InvoiceStatusService.java)
and returns it as `status` on every invoice. The frontend recalculates it with the same rules in
[`src/lib/invoiceStatus.ts`](../procapp-frontend/src/lib/invoiceStatus.ts) and uses that for
badges and button visibility.

The rules are checked **top to bottom; the first match wins**:

| # | Status | Condition | Plain meaning |
| --- | --- | --- | --- |
| 1 | `CANCELLED` | `active = false` | A manager cancelled it. This wins over everything, even if it was already submitted to finance. |
| 2 | `SUBMITTED` | `listNo` is set | It has been batched to finance (has a List No). |
| 3 | `GRN_RECEIVED` | `grnNumber` is not blank **and** `grnReceivedDate` is set | Goods received note complete. Ready for finance. |
| 4 | `GRN_PENDING` | `grnNumber` is not blank, but `grnReceivedDate` is empty | GRN number allocated but received date not recorded. |
| 5 | `OPEN` | anything else | Newly entered; no GRN yet. |

### How an invoice moves between states

| Action (endpoint) | Who | Allowed when | Effect |
| --- | --- | --- | --- |
| Create (`POST /api/invoices`) | PROC, PROC_MGR | Always (subject to validation & duplicate check) | New invoice, `active = true`. Can be created already carrying GRN fields. |
| Edit (`PUT /api/invoices/{id}`) | PROC, PROC_MGR | **Not** `CANCELLED`, **not** `SUBMITTED` (else `409`) | Any field, including GRN number/date. Cannot set `listNo`. |
| Add GRN (`POST …/{id}/grn`) | PROC, PROC_MGR | **Not** `CANCELLED` (else `409`) | Sets `grnNumber` **only**. The UI then sends a follow-up edit to set `grnReceivedDate` (and PIO). |
| Upload attachment (`POST …/{id}/attachment`) | PROC, PROC_MGR | Any state | Replaces the attachment; resets "viewed" to false. |
| Add to Finance (`POST …/batch-add-to-finance`) | PROC, PROC_MGR | **Every** invoice in the batch must be active, have a GRN number, and have no List No. Otherwise the whole batch is rejected (`422`) and nothing changes. | All get the same new List No and today's date → `SUBMITTED`. |
| Clear from finance (`POST …/{id}/clear-finance-submission`) | PROC, PROC_MGR | Any state (no check) | Removes List No and finance date → status recomputed (normally back to `GRN_RECEIVED`/`GRN_PENDING`; a cancelled invoice stays `CANCELLED`). The List No is **never reissued**. |
| Cancel (`POST …/{id}/cancel`) | PROC_MGR only | Any state | `active = false` → `CANCELLED`. Keeps its List No if it had one. |
| Reactivate (`POST …/{id}/activate`) | PROC_MGR only | Refused (`409`) if an active exact duplicate now exists | `active = true` → status recomputed. |
| Delete (`DELETE /api/invoices/{id}`) | PROC, PROC_MGR | Refused (`409`) if it has a List No, or has **both** GRN number and GRN received date | Permanent removal (the audit trail keeps a record). |

Note that Add to Finance requires only a **GRN number**, not a GRN received date. So a
`GRN_PENDING` invoice can be submitted. Whether that is intended is an open question (see
Known Limitations).

### The report screen's "Report Status" filter is different

The Invoice Report's status filter (`reportStatus` param,
[`InvoiceSpecifications.reportStatus`](../procapp-backend/src/main/java/lk/maga/procapp/repository/InvoiceSpecifications.java))
**ignores cancellation** and uses its own labels:

| Filter value | Matches |
| --- | --- |
| `NOT_SUBMITTED` | No GRN number (it really means "no GRN"; cancelled invoices included) |
| `GRN_PENDING` | GRN number, no GRN received date (including submitted ones) |
| `GRN_RECEIVED` | GRN number + received date + no List No |
| `SUBMITTED` | Has a List No (including cancelled ones) |

### Dashboard definitions (SENIOR_MANAGER)

From [`DashboardRepository.java`](../procapp-backend/src/main/java/lk/maga/procapp/repository/DashboardRepository.java):

- **Outstanding value** = sum of `value` for active invoices with no List No.
- **GRN pending count** = active invoices missing a GRN number **or** a GRN received date. This
  is **not** the same as the `GRN_PENDING` status: it includes `OPEN` invoices, and doesn't
  exclude submitted ones.
- **Ready to submit** = active, GRN number + GRN date, no List No.
- **Submitted this month** = sum of `value` with a finance date in the current month (cancelled
  invoices are **not** excluded).
- **Aging** is measured from `invoice_date` over active, unsubmitted invoices, in buckets
  `<30`, `31-45`, `46-60`, `61-75`, `76-90`, `91-120`, `120+`.
- **Cycle time** = average days from `received_date` to `finance_submit_date`.

---

## Security-sensitive business rules: verify these first

These rules have comments explaining **why** they exist, and most come from real bugs in the
old system (the code calls them F-04, F-10, F-13, F-15, F-17, F-18 and "legacy IDOR bug"). A
regression in any of them is high-impact. Most have a backend regression test in
[`SecurityCriticalTests.java`](../procapp-backend/src/test/java/lk/maga/procapp/SecurityCriticalTests.java),
but that only covers the API. **QA should check them through the UI and with direct API
calls.**

| # | Rule | Why it matters (from the code comments) | How to check | Where |
| --- | --- | --- | --- | --- |
| 1 | **You can only edit your own profile.** `PUT /api/users/me` takes the user from the token and ignores any `id`, roles, projects or active flag in the body. | The legacy system had an IDOR bug: a hidden `id` field let anyone edit anyone's profile. | As a non-admin, send `PUT /api/users/me` with `{"id": <other user>, "name": "x", "roleIds":[…]}`. Only your own name changes, and no roles change. | `MeUpdateRequest.java`, `UserService.updateMe` |
| 2 | **Site keepers only see their assigned projects**, and an out-of-scope project or invoice ID returns empty/404, never the full list. | Row-level scoping. 404 instead of 403 stops IDs being probed. A keeper with no projects (and "All projects" off) sees **nothing**. | Keeper assigned to project A: filter by project B → empty; download attachment of a B invoice by ID → 404. | `InvoiceService.java:389`, `:513` |
| 3 | **Add to Finance is all-or-nothing.** If any invoice in the batch is invalid, **none** are changed. | Legacy bug: a failure part-way left earlier invoices silently submitted. | Stage one valid invoice and one without a GRN; submit → error, and the valid one is still unsubmitted. | `InvoiceService.batchAddToFinance` |
| 4 | **Cancelled or already-submitted invoices can never be batched.** | Prevents paying a cancelled invoice or paying one twice. | Try via API with a cancelled ID and an already-batched ID → `422`. | same |
| 5 | **Finance List Numbers are unique and never reused**, even after a batch is cleared, and even under concurrent submissions. Format `YYYY/MM/DD/NNN`, NNN restarts each month. | F-18: the old generator counted batches, so clearing one caused the next batch to reuse its number and merge two submissions in reports. | Submit batch → clear it → submit another → new number is higher, not the same. Two people submitting at the same moment get different numbers. | `FinanceBatchNumberService.java`, `V4__finance_batch_numbering.sql` |
| 6 | **Invoices can't be hard-deleted once submitted to finance or once GRN is complete** (must be cancelled instead). | F-10: keep the record and batch totals intact. | Delete a `SUBMITTED` or `GRN_RECEIVED` invoice via API → `409`. | `InvoiceService.java:207` |
| 7 | **Submitted or cancelled invoices can't be edited**; a cancelled invoice's GRN can't be changed. | Protect finance-submitted data. | `PUT` a submitted/cancelled invoice → `409`; `POST /grn` on a cancelled one → `409`. | `InvoiceService.update`, `setGrn` |
| 8 | **Exact duplicates are blocked on the server**: same supplier + same invoice number (ignoring case and surrounding spaces) + same amount, among active invoices. Also blocked on edit and on **reactivate**. | F-15: stops the same invoice being paid twice, including the "cancel A → re-enter A → reactivate A" loophole. Same number with a *different* amount is only a warning. | Create duplicate → `422` on `invoiceNumber`; cancel original, re-enter it, reactivate original → `409`. | `InvoiceService.isExactDuplicate`, `activate` |
| 9 | **Spreadsheet formula injection is blocked.** Invoice number, PO number, PIO number and GRN number must start with a letter or digit and contain no control characters; exports also neutralise cells starting with `= + - @ tab CR`. | F-17: these values end up in CSV/Excel files opened by managers. | Enter `=HYPERLINK(...)`, `+1+1`, `@SUM(1)` in those fields → `422`. Export a report and inspect cells. | `InvoiceRequest.java:18`, `reportExport.ts:67` |
| 10 | **Attachments are type-checked by content** (real PDF/JPEG/PNG only), stored under a random name, and always downloaded as a file (`application/octet-stream`, `nosniff`), never displayed inline. File paths can't escape the storage folder. | Stored-XSS fix (commit `1d83f75`): a renamed script or SVG could otherwise run in a colleague's browser. | Upload an `.html`/`.svg` renamed to `.pdf` → `400`. Upload a real PDF → OK. | `FileStorageService.java:76`, `:97` |
| 11 | **Sessions are revoked immediately** on logout, password change (own or by admin), role change, and deactivation. Permissions always come from the **database**, never from the roles written inside the token. | F-04: before this, a disabled or demoted user kept access for up to 10 hours. | Copy a token, log out → reuse token → `401`. Admin deactivates or demotes a logged-in user → their next request fails / loses access. | `JwtAuthenticationFilter.java:57–61`, `UserService.update`, `V5` |
| 12 | **Login doesn't reveal whether an account exists or is disabled**, and locks an email for 10 min after 5 wrong passwords. | Stops account enumeration and brute force. | Wrong password vs. inactive account → identical `401` message. 6th attempt → `429`. | `AuthController.java:57`, `LoginAttemptService.java` |
| 13 | **Roles are data, permissions are not.** A custom role grants nothing; `SYSTEM_ADMIN` can't be assigned via the API; only `SYSTEM_ADMIN` can read the audit log, not even `ADMIN`. | Prevents privilege creep through role naming. | Create a custom role, give it to a user → no screens. Try to assign SYSTEM_ADMIN via API → `422`. ADMIN calls `/api/audit-log/invoices` → `403`. | `UserService.java:240`, `AuditLogController` |
| 14 | **Only Procurement Managers can cancel/reactivate or write remarks**, enforced on the server, not just hidden in the UI. | A client-side check is not a security boundary (stated in `api-contract.md`). | As PROCUREMENT, call `/cancel` → `403`; send `remarks` in create/update → `422`. | `InvoiceController.java:121`, `InvoiceService.java:118` |
| 15 | **Invoice author comes from the login session**, and `id`, `createdAt`, `authorUserId` can't be changed. Tampering is **rejected** (`422`), not silently ignored. | Integrity of who-entered-what. | `PUT` with a different `authorUserId` → `422`. | `InvoiceService.update` |
| 16 | **The invoice audit log is append-only and survives deletion** of the invoice it describes. Actions recorded: `CREATE`, `UPDATE`, `DELETE`, `CANCEL`, `ACTIVATE`, `SET_GRN`, `ADD_TO_FINANCE`, `CLEAR_FINANCE_SUBMISSION`, `UPLOAD_ATTACHMENT`. | F-13. | Delete a new invoice → its audit rows still visible to SYSTEM_ADMIN. | `V2__invoice_audit_log.sql`, `InvoiceService.recordAudit` |
| 17 | **Delete behaviour differs by entity**: deleting a **project deletes all its invoices** (database cascade); deleting a **supplier** is blocked if any invoice uses it; deleting a **user** is blocked if they authored invoices. | Supplier/user history must not be orphaned. The project cascade is deliberate. | Check the delete-impact count shown before deleting a project matches what's removed. | `ProjectService.java:54`, `SupplierService.delete`, `UserService.java:205` |
| 18 | **Server errors don't leak internals.** Unexpected exceptions return a generic `500 "Internal server error"`; details go to the server log only. | Commit `46b1477`. | Any 500 response body should contain no stack trace or SQL. | `GlobalExceptionHandler.java:47` |
| 19 | **The backend refuses to start with the placeholder JWT secret.** | A real signing key was once committed (commit `b4028d9`). | Start with `JWT_SECRET=changeme…` → startup fails. | `JwtService.java:27` |

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for gaps in these rules, including one where
an `ADMIN` can undermine rule 13.
