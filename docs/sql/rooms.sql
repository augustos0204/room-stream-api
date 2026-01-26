-- ROOMS TABLE
-- STORES ROOM METADATA IN SUPABASE

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rooms_created_by_idx ON rooms (created_by);
CREATE INDEX IF NOT EXISTS rooms_created_at_idx ON rooms (created_at);
