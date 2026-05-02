
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum keeps the type column constrained without a lookup table
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Students
CREATE TABLE IF NOT EXISTS students (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  roll_no    VARCHAR(50)  UNIQUE NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID              NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  message    TEXT              NOT NULL,
  is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_student_unread
  ON notifications (student_id, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_student_time
  ON notifications (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type_time
  ON notifications (type, created_at DESC);
