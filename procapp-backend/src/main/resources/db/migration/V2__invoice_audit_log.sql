-- Append-only audit trail for invoices. No FK to invoices(id) on purpose:
-- history must survive the row it describes (hard delete is still allowed
-- for brand-new, never-received, never-submitted invoices), so the
-- reference is a plain id, not a cascading/blocking foreign key.
-- Application code must only ever INSERT into this table.

CREATE TABLE invoice_audit_log (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  action VARCHAR(30) NOT NULL,
  performed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_data TEXT,
  after_data TEXT
);

CREATE INDEX idx_invoice_audit_log_invoice_id ON invoice_audit_log(invoice_id);
CREATE INDEX idx_invoice_audit_log_performed_at ON invoice_audit_log(performed_at);
