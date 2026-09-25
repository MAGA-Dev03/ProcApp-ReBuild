-- Finance batch list numbers (YYYY/MM/DD/NNN, NNN restarting each month)
-- used to be generated as COUNT(DISTINCT list_no) + 1 with no lock and no
-- unique constraint, so two concurrent batches could get the same number,
-- and clearing a batch lowered the count so a later batch reused its number.
--
-- finance_batches: one row per batch number ever issued. Its primary key is
-- the hard guarantee that a number can never be issued twice. Rows are never
-- deleted, even when a batch's invoices are cleared.
--
-- finance_batch_sequence: last NNN issued per month. The application bumps it
-- with a single INSERT ... ON CONFLICT DO UPDATE ... RETURNING, which takes a
-- row lock, so concurrent batches are serialised and always get distinct
-- numbers. The counter only ever goes up.

CREATE TABLE finance_batches (
  list_no VARCHAR(20) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE finance_batch_sequence (
  period CHAR(7) PRIMARY KEY,          -- 'YYYY/MM'
  last_value INT NOT NULL CHECK (last_value >= 0)
);

-- Backfill every batch number already on an invoice.
INSERT INTO finance_batches (list_no, created_at)
SELECT list_no, COALESCE(MIN(finance_submit_date)::timestamptz, now())
FROM invoices
WHERE list_no IS NOT NULL AND list_no <> ''
GROUP BY list_no;

-- Seed each month's counter from the highest NNN already used (not the
-- count: existing months have gaps, so count + 1 would collide).
INSERT INTO finance_batch_sequence (period, last_value)
SELECT LEFT(list_no, 7), MAX(split_part(list_no, '/', 4)::int)
FROM finance_batches
WHERE list_no ~ '^\d{4}/\d{2}/\d{2}/\d+$'
GROUP BY LEFT(list_no, 7);
