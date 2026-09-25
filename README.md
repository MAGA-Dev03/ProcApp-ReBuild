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

### Configuration

The backend reads every environment-specific setting from an environment
variable (see
[`application.yml`](procapp-backend/src/main/resources/application.yml)). The
defaults are for local development. Do not edit `application.yml` to deploy.

| Variable | Default | Production |
| --- | --- | --- |
| `DB_PASSWORD` | none, required | Required |
| `JWT_SECRET` | none, required | Required. Use a long random value that is unique to the environment, e.g. `openssl rand -base64 64`. Never commit it |
| `DB_URL` | `jdbc:postgresql://localhost:5432/procapp` | Set to the production database |
| `DB_USERNAME` | `postgres` | Set to a dedicated application user, not `postgres` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Set to the frontend's public origin, e.g. `https://procapp.example.com`. Separate multiple origins with commas. If this is wrong, the browser blocks every API call |
| `SERVER_PORT` | `8080` | Set if the host or proxy expects another port |
| `ATTACHMENTS_DIR` | `C:/procapp-data/attachments` | Set to a persistent, backed-up folder |

Production deployment checklist:

1. Set every variable in the "Production" column. Do not rely on the defaults.
2. Make sure `CORS_ALLOWED_ORIGINS` matches the URL users open, including the
   scheme and any port.
3. Make sure the database user can create and alter tables. Flyway applies
   migrations on startup.

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
