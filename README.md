# ProcApp — Procurement System

Monorepo for the procurement application.

| Module | Stack | Path |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | [`procapp-frontend/`](procapp-frontend/) |
| Backend | Java + Spring Boot | [`procapp-backend/`](procapp-backend/) |

Shared docs: [`docs/api-contract.md`](docs/api-contract.md)

## Getting started

### Frontend

```bash
cd procapp-frontend
npm install
npm run dev
```

### Backend

```bash
cd procapp-backend
./mvnw spring-boot:run
```

### Database schema changes

The PostgreSQL schema is managed by Flyway. Migrations are in
[`procapp-backend/src/main/resources/db/migration/`](procapp-backend/src/main/resources/db/migration/)
and run automatically when the backend starts.

- Every schema change goes in a new `V<next>__<description>.sql` file. Do not
  change the schema by hand in pgAdmin.
- Never edit a migration after it has been applied anywhere. Flyway checks
  checksums and will refuse to start. Write a new migration instead.
- An empty database is built entirely from the migrations.

Each module has its own README / build config; commands must be run from inside the
module directory.
