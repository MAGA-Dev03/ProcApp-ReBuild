-- ProcApp initial schema (PostgreSQL)
-- Legacy-import columns (the old, never-committed procapp_migration.sql) are in V6.

CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('WORKING','FINISHED')),
  contract_name VARCHAR(255)
);

CREATE UNIQUE INDEX uq_project_code ON projects (LOWER(code));

CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  business_partner_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  email VARCHAR(255),
  contact VARCHAR(100)
);

CREATE UNIQUE INDEX uq_supplier_bpc ON suppliers (LOWER(business_partner_code));
CREATE UNIQUE INDEX uq_supplier_email ON suppliers (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE UNIQUE INDEX uq_role_name ON roles (LOWER(name));

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  all_projects BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_user_email ON users (LOWER(email));

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_projects (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, project_id)
);

CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_type VARCHAR(10) NOT NULL CHECK (invoice_type IN ('CREDIT','ADVANCE','LC')),
  invoice_source VARCHAR(10) NOT NULL CHECK (invoice_source IN ('DIRECT','STORES','PROJECT')),
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  received_date DATE NOT NULL,
  purchase_order_number VARCHAR(100) NOT NULL,
  value NUMERIC(14,2) NOT NULL CHECK (value > 0),
  pio_number VARCHAR(100),
  grn_number VARCHAR(255),
  grn_received_date DATE,
  list_no VARCHAR(20),
  finance_submit_date DATE,
  remarks TEXT,
  attachment_url VARCHAR(500),
  attachment_viewed BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  author_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by_user_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_supplier_invnum ON invoices(supplier_id, LOWER(invoice_number));
CREATE INDEX idx_invoices_list_no ON invoices(list_no);
CREATE INDEX idx_invoices_finance_submit_date ON invoices(finance_submit_date);


ALTER TABLE invoices ALTER COLUMN grn_number TYPE VARCHAR(255);