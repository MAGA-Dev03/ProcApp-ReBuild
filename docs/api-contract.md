# ProcApp API Contract

This document is the spec for the Spring Boot backend build. It describes every endpoint the
current mock API layer (`src/api/mock/`) exposes to the frontend, in REST terms, along with the
business rules each endpoint must enforce **server-side** — the mock enforces them today only to
keep the frontend honest during development; they are not optional in the real implementation.

The frontend never talks to these endpoints directly — it goes through `src/api/client.ts`, a
single swap point. Once the real API exists, only that file's implementations change; call sites
and payload/response shapes should not need to.

## Conventions

### Pagination envelope

Every list endpoint returns Spring Data's `Page<T>` shape:

```ts
interface Page<T> {
  content: T[]
  page: number // zero-indexed
  size: number
  totalElements: number
  totalPages: number
}
```

Common query params on paginated endpoints: `page` (default `0`), `size` (default `20`), `sort`
(not currently used by the frontend, but reserved).

### Error envelope

```ts
interface ApiError {
  message: string
  status: number
  fieldErrors?: Record<string, string> // field name -> user-facing message
}
```

Status codes in use:

| Status | Meaning in this app |
|---|---|
| 400 | Generic/default error |
| 401 | Invalid credentials, or inactive-user login attempt |
| 404 | Entity not found by id |
| 409 | Blocked by a referential-integrity rule (conflict) — see delete rules below |
| 422 | Validation failure; `fieldErrors` keyed by form field name so the UI can show an inline message instead of a generic one |
| 500 | Server-side data-integrity error (e.g. an invoice's FK points at a project/supplier/user that no longer exists) — should never happen if FK constraints are enforced by the schema |

### Auth & authorization

All endpoints except `POST /api/auth/login` require a valid bearer token. The authenticated
user's id and roles must be derived **from the verified token/session**, never from any
client-supplied field — see the explicit call-outs under Invoices (§Site Store Keeper scoping) and
Users (§Profile self-service) below; both are modeled on real bugs in the legacy system.

Route-level role gating (mirrors `src/routes/navConfig.ts`):

| Area | Allowed roles |
|---|---|
| `/invoices`, `/invoices/submitted`, `/invoices/add-to-finance` | PROCUREMENT, PROCUREMENT_MANAGER |
| `/invoices/report` (and its Generate Finance Report action) | PROCUREMENT, PROCUREMENT_MANAGER, REPORT_USER, SENIOR_MANAGER |
| `/site-keeper` | SITE_STORE_KEEPER |
| `/dashboard` | SENIOR_MANAGER |
| `/projects`, `/suppliers`, `/users` (all CRUD) | ADMIN |
| `/profile` (self-service) | any authenticated user, scoped to their own account |

A few actions are gated *within* an otherwise-shared screen at the UI layer today (e.g. only
PROCUREMENT_MANAGER sees Cancel/Activate on the Invoices screen, and only PROCUREMENT_MANAGER can
enter Remarks on the invoice form). The real backend must enforce these server-side too — a
client-side-only check is not a security boundary.

### Roles are data, permissions are not

`Role { id, name }` is a real, admin-extensible table (see `POST /api/roles`) — an admin can add a
custom role name at any time. But the table above (and every `roles: [...]` gate in this document)
is keyed on a **fixed, well-known set of role names** (`ADMIN`, `PROCUREMENT`, `PROCUREMENT_MANAGER`,
`SENIOR_MANAGER`, `REPORT_USER`, `SITE_STORE_KEEPER`). A custom role can be assigned to a user like
any other, but it does not itself unlock any of the areas above — only assigning one of the six
well-known names does. Don't derive authorization from "does the user have any role in the `roles`
table"; derive it from "does the user have one of these specific names."

---

## Domain types

```ts
type ProjectStatus = 'WORKING' | 'FINISHED'
interface Project {
  id: number
  code: string          // unique, case-insensitive
  name: string
  status: ProjectStatus
  contractName: string
}

interface Supplier {
  id: number
  businessPartnerCode: string  // unique, case-insensitive
  name: string
  address: string
  email: string                // unique, case-insensitive
  contact: string
}

interface Role {
  id: number
  name: string          // admin-extensible; see "Roles are data, permissions are not" above
}

interface User {
  id: number
  name: string
  email: string          // unique, case-insensitive
  allProjects: boolean   // true = full project access, bypasses UserProject join table
  active: boolean         // inactive users cannot log in
  createdAt: string       // ISO date
  roles: Role[]           // resolved from the UserRole join table
  projects?: Project[]    // resolved from the UserProject join table; meaningful only when allProjects is false
}

type InvoiceType = 'CREDIT' | 'ADVANCE' | 'LC'
type InvoiceSource = 'DIRECT' | 'STORES' | 'PROJECT'

interface Invoice {
  id: number
  invoiceType: InvoiceType
  invoiceSource: InvoiceSource
  projectId: number
  supplierId: number
  invoiceNumber: string
  invoiceDate: string           // ISO date
  receivedDate: string          // ISO date
  purchaseOrderNumber: string
  value: number
  pioNumber: string
  grnNumber: string | null
  grnReceivedDate: string | null
  listNo: string | null         // format YYYY/MM/DD/NNN; set only once submitted to finance - see batch rule below
  financeSubmitDate: string | null
  remarks: string | null
  attachmentUrl: string | null
  attachmentViewed: boolean
  active: boolean                // false = cancelled (soft, audit-preserving)
  authorUserId: number
  updatedByUserId: number | null
  createdAt: string
  updatedAt: string
}

// Returned by every invoice list/detail endpoint - FKs resolved server-side.
interface InvoiceWithRelations extends Invoice {
  project: Pick<Project, 'id' | 'code' | 'name' | 'status'>
  supplier: Pick<Supplier, 'id' | 'name' | 'businessPartnerCode'>
  author: Pick<User, 'id' | 'name'>
  updatedBy: Pick<User, 'id' | 'name'> | null
}
```

**Computed, not stored:** the UI derives a 5-state invoice status (`OPEN`, `GRN_PENDING`,
`GRN_RECEIVED`, `SUBMITTED`, `CANCELLED`) purely from `active`/`listNo`/`grnNumber`/`grnReceivedDate`
(`!active` → `CANCELLED`; `listNo` set → `SUBMITTED`; `grnNumber` + `grnReceivedDate` both set →
`GRN_RECEIVED`; `grnNumber` only → `GRN_PENDING`; else `OPEN`). The backend does not need to
persist this, but should replicate the same derivation if it ever needs to filter/report by status
(see the Invoice Report's `reportStatus` filter below) so the two never drift apart.

---

## Auth

### `POST /api/auth/login`

**Request body:**
```ts
{ email: string, password: string }
```

**Response `200`:**
```ts
{ token: string, user: User }
```

**Errors:** `401` if the email doesn't match an active user or the password is wrong. Login must
fail for an inactive user (`active: false`) even with a correct password — the mock explicitly
tests this today.

---

## Invoices

### `GET /api/invoices`

Query params (all optional):

| Param | Type | Meaning |
|---|---|---|
| `projectId` | number | exact match |
| `supplierId` | number | exact match |
| `invoiceType` | InvoiceType | exact match |
| `invoiceSource` | InvoiceSource | exact match |
| `active` | boolean | exact match |
| `hasListNo` | boolean | `true` = has a list number assigned |
| `financeSubmitted` | boolean | `true` = `financeSubmitDate` is set |
| `search` | string | matches `invoiceNumber`, `purchaseOrderNumber`, or `listNo` (case-insensitive, substring) |
| `dateFrom` / `dateTo` | ISO date | range filter on `invoiceDate` |
| `receivedDateFrom` / `receivedDateTo` | ISO date | range filter on `receivedDate` |
| `dateType` | `invoiceDate\|receivedDate\|grnReceivedDate\|financeSubmitDate` | which date field `dateExact` applies to |
| `dateExact` | ISO date | exact-day match against the field named by `dateType` |
| `reportStatus` | `NOT_SUBMITTED\|GRN_PENDING\|GRN_RECEIVED\|SUBMITTED` | finance-processing status filter (see computed-status note above; independent of `active`) |
| `listNo` | string | exact match |
| `page`, `size` | number | pagination |

**Response `200`:** `Page<InvoiceWithRelations>`, sorted by `invoiceDate` descending.

**Authorization:** PROCUREMENT, PROCUREMENT_MANAGER, REPORT_USER, or SENIOR_MANAGER depending on
which screen is calling it (Invoices/Submitted/Add-to-Finance vs. the Report screen — see the
route table above). This is the *unscoped* endpoint; Site Store Keepers must use the scoped
endpoint below, never this one.

### `GET /api/site-keeper/invoices`

Same query params as `GET /api/invoices` above, **minus** any way to request a different project
scope — there is no `projectIds` param on the request; scope is derived entirely server-side.

**Response `200`:** `Page<InvoiceWithRelations>`.

**Business rule — server-side project scoping (security-critical):**
- Resolve the caller's identity (`currentUserId`) from the verified session/JWT, never from a
  request parameter.
- If that user's `allProjects` is `true`, behave exactly like `GET /api/invoices`.
- Otherwise, restrict results to the set of project ids on the user's own `UserProject`
  assignments — apply this as a `WHERE project_id IN (...)` at the query/repository layer, not as
  a post-filter and not in application code that a caller could bypass.
- If the request's `projectId` filter names a project **outside** that allowed set, return an
  **empty page** — do not fall back to "no project filter = show everything." This mirrors a
  row-level-security policy: a tampered request can only narrow its own scope further, never widen
  it.

**Authorization:** SITE_STORE_KEEPER.

### `GET /api/invoices/{id}`

**Response `200`:** `InvoiceWithRelations`. **Errors:** `404` if not found.

### `POST /api/invoices`

**Request body:**
```ts
{
  invoiceType: InvoiceType
  invoiceSource: InvoiceSource
  projectId: number
  supplierId: number
  invoiceNumber: string
  invoiceDate: string
  receivedDate: string
  purchaseOrderNumber: string
  value: number            // must be > 0
  pioNumber: string
  remarks?: string
  attachmentUrl?: string
  grnNumber?: string
  grnReceivedDate?: string
  // authorUserId is NOT part of the request body - see rule below
}
```

**Response `201`:** `Invoice` (freshly created; `listNo`/`financeSubmitDate` null, `active: true`,
`attachmentViewed: false`, `authorUserId` = caller, `createdAt`/`updatedAt` = now).

**Business rules:**
- `authorUserId` comes from the authenticated session, never the request body.
- `projectId` and `supplierId` must reference existing rows (`422` if not).
- `value` must be `> 0` (`422` if not).
- An **exact duplicate** is rejected with `422` (`fieldErrors.invoiceNumber`): another *active*
  invoice with the same `supplierId`, the same case-insensitive/trimmed `invoiceNumber`, and the same
  `value`. The same rule applies to `PUT /api/invoices/{id}` (excluding the invoice itself) and to
  `POST /api/invoices/{id}/activate` (`409`). Cancelled invoices don't count.
- A same-number match with a *different* amount is advisory-only (see
  `GET /api/invoices/check-duplicate` below) and does not block creation.

**Authorization:** PROCUREMENT, PROCUREMENT_MANAGER.

### `PUT /api/invoices/{id}`

**Request body:** any subset of the creatable fields, plus fields the UI can edit post-creation
(`grnNumber`, `grnReceivedDate`, `listNo`, `financeSubmitDate`, `remarks`, `attachmentUrl`,
`active`). `id`, `createdAt`, and `authorUserId` are immutable — reject any attempt to change them.
`updatedByUserId` comes from the session, not the body.

**Response `200`:** the updated `Invoice`. **Errors:** `404`.

**Authorization:** PROCUREMENT, PROCUREMENT_MANAGER. Only PROCUREMENT_MANAGER may set `remarks`
(the UI hides the field for plain PROCUREMENT users — the backend must reject the field, not just
hide the input, if a PROCUREMENT user's request includes it).

### `DELETE /api/invoices/{id}`

Hard delete — for data-entry mistakes only, not a retirement action. **Response `204`.**

**Authorization:** PROCUREMENT, PROCUREMENT_MANAGER.

### `POST /api/invoices/{id}/cancel`

Audit-preserving toggle: sets `active = false` and records `updatedByUserId`/`updatedAt`. Use this,
not delete, to retire an invoice that has real history.

**Response `200`:** the updated `Invoice`. **Authorization:** PROCUREMENT_MANAGER only.

### `POST /api/invoices/{id}/activate`

Reverses `cancel` (`active = true`). Same response/authorization as `cancel`.

### `POST /api/invoices/{id}/grn`

**Request body:** `{ grnNumber: string, grnReceivedDate: string, pioNumber?: string }` (plus
session-derived `updatedByUserId`). `grnNumber` is required (`422` if blank).

**Response `200`:** the updated `Invoice`. **Authorization:** PROCUREMENT, PROCUREMENT_MANAGER.

### `POST /api/invoices/{id}/attachment-viewed`

No request body beyond the session. Sets `attachmentViewed = true` and records
`updatedByUserId`/`updatedAt`. This is called the moment a user opens an invoice's attachment link,
not on a separate confirmation step.

**Response `200`:** the updated `Invoice`. **Authorization:** any role that can see the invoice
(in practice, called from the Site Store Keeper screen, but not itself role-restricted beyond
"can view this invoice").

### `POST /api/invoices/{id}/clear-finance-submission`

"Un-batch" escape hatch: clears `listNo` and `financeSubmitDate`, sending the invoice back to the
pending-finance list. **There is no separate audit-log entry for this** beyond the invoice's normal
`updatedAt`/`updatedByUserId` fields — if the real system needs a fuller trail, that's a
deliberate gap to close, not an oversight to silently fix, since the UI explicitly discloses this
limitation to the user before they confirm.

**Response `200`:** the updated `Invoice`. **Authorization:** PROCUREMENT, PROCUREMENT_MANAGER.

### `GET /api/invoices/check-duplicate`

Query params: `supplierId: number`, `invoiceNumber: string`, `excludeInvoiceId?: number`.

**Response `200`:** `{ isDuplicate: boolean, existingInvoiceId?: number }`.

**Business rule:** soft check only. Match is `supplierId` + case-insensitive/trimmed
`invoiceNumber` equality, excluding `excludeInvoiceId` (used when editing an invoice against
itself). It exists so the UI can show an inline
"this looks like a duplicate" warning; the server separately hard-blocks the exact-duplicate case
(same number **and** amount) — see `POST /api/invoices`.

### `POST /api/invoices/batch-add-to-finance`

**Request body:**
```ts
{ invoiceIds: number[], financeSubmitDate: string }
// updatedByUserId comes from the session, not the body
```

**Response `200`:** `Invoice[]` — the same invoices, now updated.

**Business rules (all mandatory, modeled on a known bug class in the legacy system):**
1. **Validate every invoice before mutating any.** Look up all `invoiceIds`; if any is missing
   (`404`-equivalent) or lacks a `grnNumber` (`422`, "cannot be submitted to finance without a
   GRN"), reject the *entire batch* with nothing changed. The legacy system looped and updated
   invoices one at a time, so a failure partway through (e.g. on the 7th of 10) left the first 6
   silently submitted and the rest not — a real source of finance reconciliation bugs. **The real
   endpoint must wrap the whole batch in one `@Transactional` method** so the database gives the
   same all-or-nothing guarantee; this is not optional.
2. **One `listNo` for the whole batch.** "Add to Finance" is one payment submission covering
   several invoices — every invoice in the batch shares the same `listNo`, generated once per
   call, not once per invoice.
3. **Monthly-resetting sequence.** Format is `YYYY/MM/DD/NNN` where `YYYY/MM/DD` is
   `financeSubmitDate` and `NNN` is a zero-padded sequence that resets every calendar month: count
   the number of **distinct** `listNo` values already recorded with the same `YYYY/MM` prefix
   across all invoices (not just this batch, not scoped to today), and use `count + 1`. This must
   count distinct batches per month, not per day and not per invoice — a legacy bug reset the
   counter daily instead of monthly.

**Authorization:** PROCUREMENT, PROCUREMENT_MANAGER.

### `GET /api/invoices/list-numbers`

**Response `200`:** `string[]` — every distinct `listNo` currently assigned, newest first. Powers
the Invoice Report screen's searchable List No filter.

---

## Projects

### `GET /api/projects`

Query params: `status?: ProjectStatus`, `search?: string` (matches `name` or `code`,
case-insensitive), `page`, `size`.

**Response `200`:** `Page<Project>`. **Authorization:** ADMIN for the dedicated Projects screen;
also readable (unfiltered by role) wherever the frontend needs a project picker (invoice forms,
filters) — in practice any authenticated user needs read access here for those pickers to work,
even though only ADMIN can mutate.

### `GET /api/projects/{id}`

**Response `200`:** `Project`. **Errors:** `404`.

### `POST /api/projects`

**Request body:** `{ code: string, name: string, status: ProjectStatus, contractName: string }`.

**Response `201`:** `Project`.

**Business rule:** `code` must be unique, case-insensitive and trimmed. Violating this must return
`422` with `fieldErrors.code` set to a specific, friendly message ("A project with this code
already exists.") — not a generic failure the UI has to guess at.

**Authorization:** ADMIN.

### `PUT /api/projects/{id}`

**Request body:** any subset of the creatable fields. Same uniqueness rule applies to `code` if
present (excluding the project's own id). **Response `200`:** `Project`. **Errors:** `404`, `422`.

**Authorization:** ADMIN.

### `GET /api/projects/{id}/delete-impact`

**Response `200`:** `{ invoiceCount: number }` — how many invoices are currently logged against
this project. The UI calls this before showing the delete-confirmation dialog, so it can display
the exact count and a specific warning rather than a generic "are you sure?".

**Authorization:** ADMIN.

### `DELETE /api/projects/{id}`

**Response `204`.**

**Business rule — cascading delete (mirrors the legacy system's behavior, must be explicit and
transactional):** deleting a project also deletes **every invoice** referencing it, and removes
the project from any user's assigned-project list. All of this must happen in a single transaction
— never delete the project first and clean up invoices in a follow-up step, and never leave
invoices pointing at a project id that no longer exists. Because this is destructive and
irreversible, the frontend always calls `GET /api/projects/{id}/delete-impact` first and shows the
invoice count in the confirmation dialog; the backend does not need to re-confirm, but must still
perform the cascade atomically when the delete is actually called.

**Authorization:** ADMIN.

---

## Suppliers

### `GET /api/suppliers`

Query params: `search?: string` (matches `name` or `businessPartnerCode`), `page`, `size`.

**Response `200`:** `Page<Supplier>`. Read access needed anywhere a supplier picker appears, same
as Projects above.

### `GET /api/suppliers/{id}`

**Response `200`:** `Supplier`. **Errors:** `404`.

### `POST /api/suppliers`

**Request body:** `{ businessPartnerCode, name, address, email, contact }` (all strings).

**Response `201`:** `Supplier`.

**Business rule:** `businessPartnerCode` and `email` must each be unique (case-insensitive,
trimmed). Violating either returns `422` with the specific field named in `fieldErrors`.

**Authorization:** ADMIN.

### `PUT /api/suppliers/{id}`

Same shape/rules as create, partial update, uniqueness checks exclude the supplier's own id.
**Response `200`:** `Supplier`. **Errors:** `404`, `422`.

**Authorization:** ADMIN.

### `DELETE /api/suppliers/{id}`

**Response `204`.**

**Business rule — blocked, not cascaded (mirrors a real foreign-key constraint):** if any invoice
references this supplier, reject with **`409`** and a specific message naming the count, e.g.
*"This supplier can't be deleted because 12 invoices reference it. Remove or reassign those
invoices first."* Do not delete the supplier and orphan the invoices, and do not fail with a
generic/opaque error — the count must be in the message.

**Authorization:** ADMIN.

---

## Users

### `GET /api/users`

Query params: `role?: RoleName` (one of the six well-known names), `active?: boolean`,
`search?: string` (matches `name` or `email`), `page`, `size`.

**Response `200`:** `Page<User>`.

**Authorization:** ADMIN.

### `GET /api/users/{id}`

**Response `200`:** `User`. **Errors:** `404`.

### `POST /api/users`

**Request body:**
```ts
{
  name: string
  email: string
  password: string          // real backend: hash and store; see auth note below
  roleIds: number[]          // may be empty - see rule below
  allProjects: boolean
  projectIds?: number[]      // ignored when allProjects is true; may be empty - see rule below
  active?: boolean            // defaults true
}
```

**Response `201`:** `User`.

**Business rules:**
- `email` must be unique (case-insensitive, trimmed) → `422`.
- Every id in `roleIds` must reference an existing role, and every id in `projectIds` must
  reference an existing project, or `422` naming the field.
- **Zero roles and zero assigned projects are both valid states — this is a deliberate fix, not an
  oversight.** The legacy system had a bug that prevented saving a user with no roles or no
  projects assigned; the new backend must allow `roleIds: []` and `projectIds: []` (when
  `allProjects` is false) to save successfully. Do not reintroduce a "must have at least one"
  check on either field.
- When `allProjects` is `true`, `projectIds` is ignored entirely (no project-assignment rows are
  created); the frontend always sends `[]` in that case but the backend should not depend on that.

**Authorization:** ADMIN.

### `PUT /api/users/{id}`

**Request body:** same shape as create, all fields optional, `password` omitted/blank = keep the
existing password unchanged (do not overwrite it with an empty string). Same uniqueness/id-existence
and zero-roles/zero-projects rules as create apply here too.

**Response `200`:** `User`. **Errors:** `404`, `422`.

**Authorization:** ADMIN.

### `PUT /api/users/me` (self-service profile update)

**Request body:**
```ts
{ name?: string, password?: string }
// no id field anywhere in this request - see rule below
```

**Response `200`:** the caller's own updated `User`.

**Business rule — id comes from the session, never the request (security-critical, models a real
IDOR fix):** the row to update is the authenticated caller's own account, identified by the
verified session/JWT's subject. **This endpoint must not accept an id in its body, path, or any
other client-supplied field**, and must not update any account other than the caller's own — not
even if a client sends one. The legacy system's edit-profile form posted a client-supplied hidden
`id` field and trusted it, so any logged-in user could edit *anyone else's* name and password by
tampering with that field before submitting. This endpoint's payload shape (no id field, ever) is
the fix — don't reintroduce an id parameter here even for convenience.

Only `name` and `password` may change through this endpoint — never `roles`, `projects`,
`allProjects`, or `active`; those stay admin-only via `PUT /api/users/{id}`.

**Authorization:** any authenticated user, for their own account only.

### `DELETE /api/users/{id}`

**Response `204`.**

**Business rule — blocked, not cascaded (mirrors a real foreign-key constraint on
`invoices.author_user_id`):** if this user authored any invoice, reject with **`409`** and a
specific message naming the count, e.g. *"This user can't be deleted because they authored 8
invoices. Deactivate the user instead to revoke access while preserving invoice history."*
Deactivation (`active: false` via `PUT /api/users/{id}`) is the supported way to revoke a
prolific user's access without breaking invoice history.

**Authorization:** ADMIN.

---

## Roles

### `GET /api/roles`

**Response `200`:** `Role[]`, sorted by name. Not paginated (expected to stay small).

**Authorization:** ADMIN (consumed by the Users screen's role picker and its "Add new role"
quick-action).

### `POST /api/roles`

**Request body:** `{ name: string }`.

**Response `201`:** `Role`.

**Business rules:**
- `name` is required (`422` if blank/whitespace-only).
- Must be unique, case-insensitive and trimmed (`422` if a role with that name already exists).
- A newly created role is immediately assignable to users via `roleIds`, but grants **no**
  permissions by itself — see "Roles are data, permissions are not" in Conventions above.

---

## Dashboard / reporting

All endpoints in this section are read-only aggregates over the invoices table. None accept a
body; none are paginated (each returns a small, bounded array).

### `GET /api/dashboard/aging-buckets`

**Response `200`:** `AgingBucket[]` — one entry per bucket in a fixed order
(`<30, 31-45, 46-60, 61-75, 76-90, 91-120, 120+`), each `{ bucket, totalValue, invoiceCount }`.

**Business rule:** scope is "outstanding" invoices only — `active: true` and `listNo` still null
(not yet submitted to finance). Bucket is computed from `invoiceDate` age in days as of "now," with
the last bucket (`120+`) catching everything above 120 days. Buckets with zero matching invoices
must still appear in the response with zero values (fixed 7-entry shape, not a sparse map).

**Authorization:** SENIOR_MANAGER.

### `GET /api/dashboard/aging-buckets/{bucket}/breakdown`

Path param `bucket` is one of the seven bucket keys above.

**Response `200`:**
```ts
{
  bucket: AgingBucketKey
  bySupplier: Array<{ id: number, name: string, totalValue: number, invoiceCount: number }>
  byProject: Array<{ id: number, name: string, totalValue: number, invoiceCount: number }>
}
```
Both arrays sorted by `totalValue` descending. Same "outstanding invoices in this bucket" scope as
above. Powers the drill-down modal when a user clicks a bar in the aging chart.

**Authorization:** SENIOR_MANAGER.

### `GET /api/dashboard/top-suppliers?limit=10`

**Response `200`:** `TopSupplier[]`, `{ supplierId, supplierName, outstandingValue }`, sorted by
`outstandingValue` descending, truncated to `limit` (default 10). Same outstanding-invoices scope.

**Authorization:** SENIOR_MANAGER.

### `GET /api/dashboard/received-vs-submitted-trend`

**Response `200`:** `TrendPoint[]`, always exactly 12 entries covering the trailing 12 calendar
months (oldest first), each `{ month: "YYYY-MM", monthLabel: "Jan 2026", receivedValue, submittedValue }`.
`receivedValue` sums `invoice.value` by the month of `receivedDate`; `submittedValue` sums by the
month of `financeSubmitDate` (only for invoices that have one). Months with no activity must still
appear with zero values — this is a fixed trailing-12-month window, not a sparse map keyed by
whichever months happen to have data.

**Authorization:** SENIOR_MANAGER.

### `GET /api/dashboard/summary`

**Response `200`:**
```ts
interface DashboardSummary {
  outstandingValue: number       // sum of value where active && listNo is null
  grnPendingCount: number        // count where active && (grnNumber or grnReceivedDate is null)
  readyToSubmitCount: number     // count where active && grnNumber && grnReceivedDate && listNo is null
  submittedThisMonthValue: number // sum of value where financeSubmitDate falls in the current calendar month
}
```

**Authorization:** SENIOR_MANAGER.

### `GET /api/dashboard/cycle-time`

**Response `200`:**
```ts
interface CycleTimeStats {
  averageDays: number                    // avg (financeSubmitDate - receivedDate) over all-time
                                          // submitted invoices; 0 if none exist yet (not null - a
                                          // brand-new deployment is a genuine edge case, and 0 is a
                                          // safe, honest fallback for it)
  currentMonthAverageDays: number | null  // same average, scoped to invoices whose financeSubmitDate
                                          // falls in the current calendar month; null if none
  previousMonthAverageDays: number | null // same, scoped to the previous calendar month; null if none
}
```

**Business rule:** `null` (not `0`) for a month with zero submissions — the UI skips the trend
comparison line rather than plotting a misleading zero. Don't collapse the null case to `0`.

**Authorization:** SENIOR_MANAGER.

### `GET /api/dashboard/monthly-volume`

**Response `200`:** `MonthlyInvoiceVolume[]`, always exactly 12 entries covering the trailing 12
calendar months (oldest first, same fixed window as the trend endpoint above), each
`{ month: "YYYY-MM", monthLabel: "Jan 2026", invoiceCount }`. `invoiceCount` is grouped by the month
of `receivedDate`, across **all** invoices regardless of `active` — a cancelled invoice still counts
toward the month it was received in. Months with no activity must still appear with `invoiceCount: 0`.

**Authorization:** SENIOR_MANAGER.

### `GET /api/dashboard/recent-finance-batches?limit=10`

**Response `200`:** `FinanceBatchSummary[]`, `{ listNo, financeSubmitDate, invoiceCount, totalValue }`
— one entry per distinct `listNo` among invoices that have both `listNo` and `financeSubmitDate`
set, sorted by `financeSubmitDate` descending, truncated to `limit` (default 10).

**Authorization:** SENIOR_MANAGER.

---

## Endpoints intentionally out of scope for this contract

- **Seed/dev summary** (`seedSummary()` in the mock) — a development-only convenience for
  eyeballing seed data counts. Not a real product endpoint; do not build a production equivalent.
- **Client-side exports** (CSV/Excel/PDF/print/copy-to-clipboard on the Invoice Report and Finance
  Report screens) — these operate entirely on data already fetched from `GET /api/invoices`/
  `GET /api/invoices/list-numbers` and are generated in-browser. No server endpoint is needed for
  them.
