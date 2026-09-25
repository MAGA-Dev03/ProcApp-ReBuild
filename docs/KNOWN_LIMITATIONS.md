# Known Limitations, Gaps and Suspected Issues

This file lists everything found in the code that QA should know about: explicit comments
admitting a gap, and things that look partial, inconsistent, or looser than they should be.
The aim is to separate **"intended, out of scope"** from **"probably a bug"**, so nobody wastes
time on the first or misses the second.

How this was compiled (September 2026):

- Both modules were searched for comment keywords: `TODO`, `FIXME`, `HACK`, `XXX`, `gap`,
  `limitation`, `known issue`, `not implemented`, `not yet`, `stub`, `placeholder`, `for now`,
  `temporary`, `workaround`, `simplified`, `deprecated`, `legacy`, `mock`, `in-memory`,
  `best effort`.
- **Result: there are no `TODO`/`FIXME`/`HACK` comments anywhere in either module.** The few
  relevant comments are in section 1.
- Most of this file (sections 2–6) comes from **reading the controllers, services, entities and
  frontend code** directly. Each item says how confident we are:
  - **Confirmed from code**: the behaviour follows directly from the code; not necessarily run.
  - **Expected, not observed**: follows from how the frameworks behave; please confirm by trying it.
  - **Needs verification**: a likely problem that depends on UI details we couldn't fully trace.
- **Design question** means the code is consistent, but it's unclear whether the behaviour is
  what the business wants. Raise these with the product owner instead of filing them as bugs.

Paths are relative to the repo root.

---

## 1. Limitations explicitly acknowledged in comments

| # | Where | What the comment says | Status today |
| --- | --- | --- | --- |
| 1.1 | `procapp-frontend/src/features/invoices/EditInvoiceDialog.tsx:74` and `:86`; `docs/api-contract.md` §`clear-finance-submission` | "Clear from finance list" has *"no separate audit log entry, only this invoice's updatedAt/updatedBy fields"*. The contract calls it *"a deliberate gap to close"*. | **Out of date.** The backend now writes a `CLEAR_FINANCE_SUBMISSION` audit row (`InvoiceService.java:358–373`). The warning users see in the UI is wrong. |
| 1.2 | `procapp-backend/src/main/java/lk/maga/procapp/security/LoginAttemptService.java:10` | *"In-memory failed-login tracker."* | Lockout counters are lost when the backend restarts, and they aren't shared if more than one backend instance ever runs. See 4.6. |
| 1.3 | `procapp-frontend/src/features/auth/AuthContext.tsx:47` | Logout is *"Best effort: revoke the token server-side, but never let a network failure keep the user signed in locally."* | If the backend is unreachable at logout, the browser forgets the token but the server never revokes it. A copied token stays valid until it expires (10 h). Intended. |
| 1.4 | `procapp-frontend/src/api/client.ts:1–7` | *"Every function here currently delegates to the in-memory mock backend in `src/api/mock/`."* | **Out of date.** Every API module now calls the real backend. Only `seedSummary` (line 19–20, "Dev-only seed helper, stays on the mock db") and some type definitions still come from `src/api/mock/`. |
| 1.5 | `procapp-frontend/vite.config.ts:8` + `src/api/mock/testLogins.ts` | Prints *"Mock demo logins (password is the same for all)"* when the dev server starts. | Those accounts **don't exist** in the real backend. Misleading for new starters. |
| 1.6 | `procapp-backend/src/main/resources/db/migration/V1__init_schema.sql:2`, `V6__legacy_import_columns.sql:1–13` | The one-off import from the legacy system (`procapp_migration.sql`) *"was run by hand in pgAdmin and never committed"*; the `legacy_*` columns are captured but *"No application code reads these columns"*, and the import *"is not meant to be re-run"*. | Legacy import is out of scope for QA. Imported rows (`migrated_from_legacy = true`) exist only in databases that went through the import, not in a fresh local DB. |
| 1.7 | `procapp-frontend/src/lib/invoiceStatus.ts` (doc comment) | GRN number and GRN received date *"are set together in seed data today but are independent in the schema."* | They really are set separately in practice: the GRN endpoint sets only the number (see 2.3). |
| 1.8 | `docs/api-contract.md`, "Endpoints intentionally out of scope" | `seedSummary()` has no real endpoint; all CSV/Excel/PDF/print/copy exports are generated in the browser from data already fetched. | Intended. Exports have a row cap (see 2.8). |
| 1.9 | `procapp-backend/src/main/resources/application.yml` (Flyway block) | Old hand-built databases are *"baselined at V5"*. | Side effect: a **non-empty** new database also gets baselined and skips V1–V5. See LOCAL_SETUP Step 2. |

---

## 2. Likely bugs / incomplete behaviour

| # | Issue | Confidence | Where | How to see it |
| --- | --- | --- | --- | --- |
| 2.1 | **Project delete silently wipes its invoices, including ones already submitted to finance, and writes no audit rows for them.** The delete is a database `ON DELETE CASCADE`, which skips the application code that records audit entries and blocks deleting submitted invoices. That undercuts both "submitted invoices can't be hard-deleted" (F-10) and "every invoice change is audited" (F-13). The UI does warn with a count first. | Confirmed from code | `ProjectService.java:54–58`, `V1__init_schema.sql` (`invoices.project_id … ON DELETE CASCADE`) | Batch an invoice to finance, delete its project as ADMIN, then check the Audit Log as SYSTEM_ADMIN: no `DELETE` row for that invoice. |
| 2.2 | **An ADMIN can take over or remove a SYSTEM_ADMIN account.** `PUT/DELETE /api/users/{id}` (ADMIN allowed) has no protection for the target user. An ADMIN can reset a SYSTEM_ADMIN's password and log in as them, deactivate them, delete them, or strip the role by sending `roleIds` without it. That defeats "only SYSTEM_ADMIN can read the audit log, not even ADMIN". | Confirmed from code | `UserController.java:51,57`; `UserService.update` (L101), `delete` (L205) | As ADMIN: `PUT /api/users/<sysadmin id>` with `{"password":"<new>"}`, then log in as that user and open `/audit-log`. |
| 2.3 | **Recording a GRN is two separate requests, not one.** The dedicated `POST /grn` endpoint stores only the GRN number and ignores the received date. The UI then sends a second full `PUT` to set the received date and PIO number. If the second call fails (network, validation, an edit in between), the invoice is left `GRN_PENDING` with a half-saved GRN. | Confirmed from code | Backend `InvoiceService.setGrn` (L332); frontend `src/api/invoices.ts:165–178` | Hard to trigger by hand. Simulate it by blocking the `PUT /api/invoices/{id}` request in the browser DevTools (Network → Block request URL) and then using "Add GRN": the GRN number is saved, the date is not. |
| 2.4 | **Creating an invoice with an attachment is also two requests.** The invoice is saved first, then the file uploaded. If the upload fails (wrong file type, >10 MB) the invoice still exists without the attachment, and resubmitting the form then fails as an exact duplicate. | Confirmed from code | `InvoicesPage.tsx` (`createMutation`) | Add an invoice with a `.txt` renamed to `.pdf`: an error shows, but the invoice is created. Submit again → duplicate error. |
| 2.5 | **Attachments can be uploaded to cancelled and submitted invoices**, even though those invoices are otherwise locked for editing. Each upload is audited. | Confirmed from code | `InvoiceService.uploadAttachment` (L486) has no state check | `POST /api/invoices/<submitted id>/attachment` succeeds. |
| 2.6 | **Old attachment files are never deleted from disk.** Replacing or removing an attachment only changes the reference; the old file stays in `ATTACHMENTS_DIR`. | Confirmed from code | `InvoiceService.uploadAttachment`, `FileStorageService` (no delete method) | Replace an attachment, then check the folder. |
| 2.7 | **`attachmentUrl` can be set by the client** in `PUT /api/invoices/{id}` (it is copied straight from the request). Path traversal is blocked, but an invoice could be pointed at another invoice's stored file if its random file name were known, or at a name that doesn't exist (downloads then return 404). | Confirmed from code | `InvoiceService.applyFields` (L301); `FileStorageService.resolve` (L97) | `PUT` with `"attachmentUrl":"does-not-exist.pdf"` → later download gives 404. |
| 2.8 | **Exports are silently capped.** The report and site-keeper exports ask for `size=5000`, but Spring Data's default maximum page size is **2000** and `application.yml` doesn't raise it, so exports stop at 2000 rows without warning. The Finance Report PDF asks for at most **500** invoices per List No. | Expected, not observed | `InvoiceReportPage.tsx:151`, `:137`; `SiteKeeperPage.tsx:134` | Needs >2000 invoices matching the filter; compare export row count with the list's total. |
| 2.9 | **"Clear from finance" has no checks.** It works on invoices that were never submitted, and on cancelled ones, and any PROCUREMENT user (not just the manager) can do it. Every call writes an audit row. | Confirmed from code | `InvoiceService.clearFinanceSubmission` (L358) | `POST /api/invoices/<open id>/clear-finance-submission` → 200. |
| 2.10 | **Cancel and Activate don't check the current state.** Cancelling an already-cancelled invoice, or activating an active one, succeeds and writes another audit row. There's also **no confirmation dialog** for Cancel in the UI: one click cancels. | Confirmed from code | `InvoiceService.cancel` (L305), `activate` (L316); `InvoicesPage.tsx`, `InvoicesSubmittedPage.tsx` | Click Cancel. It happens immediately. |
| 2.11 | **Whitespace-only GRN numbers are treated inconsistently.** The input rule allows a GRN number made only of spaces (`^ *$` is accepted as "empty"), but the invoice form sends it as-is. Afterwards: the backend status says `OPEN` (blank), the frontend badge says `GRN_PENDING`/`GRN_RECEIVED` (non-empty string), Add to Finance rejects it (blank), and delete is blocked if a GRN date is also set (not null). | Confirmed from code | `InvoiceRequest.java:18`; `invoiceFormSchema.ts:43`; `InvoiceStatusService`; `lib/invoiceStatus.ts`; `InvoiceService.delete` | Create an invoice with GRN No = three spaces and a GRN date; compare the badge with the API `status`, then try to delete it and to batch it. |
| 2.12 | **Editing a SYSTEM_ADMIN user on the Users screen probably fails.** The role picker hides `SYSTEM_ADMIN`, but the form starts with the user's existing role IDs, and the backend rejects any update that includes `SYSTEM_ADMIN` (`422`). Depending on how the picker handles the hidden value, the edit either fails or quietly removes the role. | Needs verification | `UsersPage.tsx:83`; `UserFormModal.tsx:106`; `UserService.java:240` | Edit a SYSTEM_ADMIN user's name on the Users screen and save. |
| 2.13 | **The "Delete" button is always shown on Submitted Invoices**, but deleting a submitted invoice is always refused (`409`). | Confirmed from code | `InvoicesSubmittedPage.tsx:265` | Click delete on any row → error toast. |
| 2.14 | **Dashboard "GRN pending" doesn't match the `GRN_PENDING` status.** It counts every active invoice missing a GRN number **or** date, so it includes `OPEN` invoices and even submitted ones without a GRN date. | Confirmed from code | `DashboardRepository.java:183` | Compare the tile with a count of `GRN_PENDING` invoices. |
| 2.15 | **Dashboard "submitted" figures include cancelled invoices.** "Submitted this month", the received-vs-submitted trend, cycle time and "recent finance batches" don't filter on `active`, while "outstanding" and aging do. | Confirmed from code | `DashboardRepository.java` (`submittedThisMonthValue` L200, `submittedValueByMonth`, `recentFinanceBatches` L161) | Cancel a submitted invoice; its value stays in "submitted this month". |
| 2.16 | **Audit Log date filter uses UTC day boundaries.** For users in Sri Lanka (UTC+5:30), changes made between 00:00 and 05:30 local time are filed under the previous day. | Expected, not observed | `InvoiceAuditLogService.java:29–30` | Filter by a single date and look at entries just after local midnight. |
| 2.17 | **Audit log search can't find deleted invoices by number.** The text search matches the *current* invoice number; for a deleted invoice there is none, so its rows only show up by invoice ID or other filters. | Confirmed from code | `InvoiceAuditLogRepository.java` (LEFT JOIN on `invoices`) | Delete an invoice, then search the audit log by its number. |

---

## 3. Error handling broader than ideal

`GlobalExceptionHandler` handles four specific cases (`ResponseStatusException`, bean
validation, `ValidationException`, `AccessDeniedException`). **Everything else becomes a generic
`500 Internal server error`** (`GlobalExceptionHandler.java:47`). That's good for not leaking
details, but it means many *client* mistakes are reported as *server* errors. Expected (not
observed) examples:

| Request | Expected | What the code will likely return |
| --- | --- | --- |
| Malformed JSON, or an invalid date / number in the body | 400 | 500 |
| Missing required query param, e.g. `GET /api/dashboard/aging-buckets/breakdown` without `bucket` | 400 | 500 |
| Non-numeric ID, e.g. `GET /api/projects/abc` | 400 | 500 |
| Unknown URL or wrong HTTP method (while logged in) | 404 / 405 | 500 |
| File over 10 MB | 413 | 500 |
| Text longer than the DB column (see 4.1) or a value too large for `NUMERIC(14,2)` | 422 | 500 |
| Two people creating the same user email / project code / supplier code at the same moment (DB unique index wins the race) | 422 | 500 |
| `GET /api/dashboard/top-suppliers?limit=-1` | 400 | 500 |

The frontend then shows a generic "Something went wrong / Could not …" toast.

---

## 4. Validation looser than it probably should be

| # | Gap | Where |
| --- | --- | --- |
| 4.1 | **No maximum lengths on any text field.** The database limits them (e.g. invoice/PO/PIO number 100, GRN 255, project code 50, supplier code 50, contact 100, attachment ref 500, names/emails 255), but requests aren't checked first, so too-long input causes a 500 (section 3) instead of a field error. | All `*Request.java` DTOs vs `V1__init_schema.sql` |
| 4.2 | **No date sanity checks on invoices.** Invoice date, received date and GRN received date can be in the future, and received/GRN dates can be before the invoice date. (A future invoice date shows up in the `<30` aging bucket, which the code comments acknowledge.) | `InvoiceRequest.java` |
| 4.3 | **No upper limit on invoice value** apart from the DB column (`NUMERIC(14,2)`). Values with more than 2 decimal places are accepted and rounded by the database. | `InvoiceRequest.java` (`@DecimalMin` only) |
| 4.4 | **Password rules differ between frontend and backend.** The Users and Profile forms only check "8+ characters"; the server also requires a letter and a digit. The form accepts `abcdefgh`, then the server rejects it. | `UserFormModal.tsx:44`, `ProfilePage.tsx`; `UserService.java:221` |
| 4.5 | **Changing your own password doesn't ask for your current password.** Anyone with access to a logged-in browser can change it. A blank name in the profile update is silently ignored, not rejected. | `UserService.updateMe` (L171), `MeUpdateRequest.java` |
| 4.6 | **Login lockout is per email, in memory, and applies to any email.** Five wrong guesses against *someone else's* address locks them out for 10 minutes (a nuisance-level denial-of-service). Restarting the backend clears all lockouts. | `LoginAttemptService.java` |
| 4.7 | **Role names accept anything.** Any text becomes a role (spaces, lowercase, look-alikes like `Admin`). Such roles grant nothing, which is safe, but they can confuse admins. There's no way to rename or delete a role. | `RoleRequest.java`, `RoleService.java`, `RoleController.java` |
| 4.8 | **Duplicate IDs in a finance batch** (`{"invoiceIds":[5,5]}`) give a confusing error: "Invoice id(s) not found: []". | `InvoiceService.batchAddToFinance` (L414–418) |
| 4.9 | **No page-size limits** on `size` for audit log, invoices, etc., other than Spring's silent 2000 cap; `top-suppliers?limit=` is unbounded. | Controllers |

---

## 5. Design questions (consistent in code, intent unclear)

| # | Question | Where |
| --- | --- | --- |
| 5.1 | **Should `GRN_PENDING` invoices (GRN number, no received date) be submittable to finance?** The backend only requires a GRN number. The Add to Finance screen says it's for "invoices that have a GRN". | `InvoiceService.java:420`; `AddToFinancePage.tsx:131` |
| 5.2 | **Add to Finance lists every active, unsubmitted invoice, including ones with no GRN at all**, which the server then rejects. Should the list show only eligible invoices? | `AddToFinancePage.tsx:74–78` |
| 5.3 | **Should procurement, report and manager users be limited to their assigned projects?** Today only site keepers are scoped; the "Projects" on other users' accounts does nothing. | `InvoiceController.list` vs `InvoiceService.listForSiteKeeper` |
| 5.4 | **Should site keepers see cancelled invoices?** Their list has no active filter. | `InvoiceService.listForSiteKeeper` (L375) |
| 5.5 | **Does `SYSTEM_ADMIN` need invoice/dashboard access?** The migration comment calls it "full system access", but it only gets admin screens + audit log. | `V3__system_admin_role.sql:1`; no role hierarchy in `SecurityConfig` |
| 5.6 | **Should only managers be able to clear a finance submission?** Currently any PROCUREMENT user can (see 2.9). | `InvoiceController.clearFinanceSubmission` |
| 5.7 | **Only invoices are audited.** Changes to users, roles, projects and suppliers leave no trail; "attachment viewed" isn't audited either. | `InvoiceService.recordAudit` is the only audit writer |
| 5.8 | **Suppliers can't be deactivated.** The error when deleting a supplier in use says "Consider deactivating instead", but suppliers have no active flag. | `SupplierService.java:57`; `Supplier.java` |
| 5.9 | **The report's `NOT_SUBMITTED` filter actually means "no GRN"**, and none of the report filters exclude cancelled invoices. Is that what finance expects? | `InvoiceSpecifications.reportStatus` |
| 5.10 | **Marking an attachment "viewed" works even if there's no attachment.** | `InvoiceService.markAttachmentViewedForSiteKeeper` |

---

## 6. Environment, tooling and documentation gaps

| # | Gap | Where |
| --- | --- | --- |
| 6.1 | **No seed data and no default admin.** A fresh database has one role and no users; bootstrapping needs manual SQL (see LOCAL_SETUP Step 6). | `db/migration/` |
| 6.2 | **The backend tests depend on your local database** at a hard-coded `localhost:5432/procapp` with user `postgres`, and on roles already existing. On a fresh DB they fail until the roles are inserted. `DB_PASSWORD` falls back to the main developer's local password (`dev03`). | `src/test/resources/application.yml`, `SecurityCriticalTests.java` |
| 6.3 | **No frontend tests** of any kind. | `procapp-frontend/` |
| 6.4 | **The frontend's backend address is hard-coded** to `http://localhost:8080`. It can't be changed per environment without editing code. The GitHub Pages deploy workflow therefore publishes a frontend that can only talk to a backend on the *viewer's own* machine, and `vercel.json`'s CSP also only allows `localhost:8080`. | `src/api/http.ts:4`; `.github/workflows/deploy-gh-pages.yml`; `procapp-frontend/vercel.json` |
| 6.5 | **`.env.example` isn't loaded by anything.** Spring Boot doesn't read `.env` files. | `procapp-backend/.env.example` |
| 6.6 | **The developers' VS Code `launch.json` isn't in the repo** (`.vscode/` is git-ignored), even though code comments refer to it. | root `.gitignore`, `procapp-backend/.gitignore` |
| 6.7 | **`docs/api-contract.md` has drifted from the code** in places: it says the GRN endpoint accepts `grnReceivedDate`/`pioNumber` (it doesn't); gives the aging breakdown as `/aging-buckets/{bucket}/breakdown` (the real path is `/aging-buckets/breakdown?bucket=`); lists ADMIN-only for projects/suppliers/users (SYSTEM_ADMIN is also allowed); talks about "six" well-known roles (there are seven); and says clear-finance isn't audited (it is). **Trust the code / SYSTEM_OVERVIEW.md.** | `docs/api-contract.md` |
| 6.8 | **The Style Guide page** (`/style-guide`) is a developer page reachable by any logged-in user. Harmless, but not a product feature. | `src/routes/index.tsx:113–114` |
| 6.9 | **Client-side filtering after paging.** `listUsers` filters by role/active, and `listProjects` by status, *after* fetching one page, so counts and pages would be wrong if those filters were used. (The current screens don't appear to pass them.) | `src/api/users.ts:35–38`, `src/api/projects.ts:21` |
| 6.10 | **The JWT is kept in browser storage** (`localStorage` with "Remember me", otherwise `sessionStorage`), so any XSS on the site could read it. This is a common trade-off, not a bug, but it is why the attachment XSS fix (SYSTEM_OVERVIEW rule 10) matters so much. | `src/lib/authStorage.ts` |
| 6.11 | **A `node_modules/` folder at the repo root is committed to git** (about 11,800 files, separate from `procapp-frontend/node_modules`, which is correctly ignored). It makes clones slow and large; it isn't used by either module. | repo root |
| 6.12 | **No PostgreSQL version is pinned anywhere.** The only known working version is 18 (the main developer's machine). | — |
