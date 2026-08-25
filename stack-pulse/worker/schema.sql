CREATE TABLE IF NOT EXISTS checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  indicator TEXT NOT NULL,
  description TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  source_url TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checks_service_id ON checks(service_id,id DESC);