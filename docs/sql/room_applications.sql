-- ROOM APPLICATIONS TABLE
-- RELATIONSHIP BETWEEN ROOMS AND APPLICATIONS

CREATE TABLE IF NOT EXISTS room_applications (
  room_id TEXT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  created_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, application_id)
);

CREATE INDEX IF NOT EXISTS room_applications_room_id_idx ON room_applications (room_id);
CREATE INDEX IF NOT EXISTS room_applications_application_id_idx ON room_applications (application_id);
CREATE INDEX IF NOT EXISTS room_applications_created_by_idx ON room_applications (created_by);
