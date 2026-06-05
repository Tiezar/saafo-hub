-- CreateTable: user_event_types
CREATE TABLE "user_event_types" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT 'Calendar',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "key" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "user_event_types_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_event_types" ADD CONSTRAINT "user_event_types_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Convert calendar_events.type from EventType enum to plain text
ALTER TABLE "calendar_events" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- Drop the enum (safe now that no column references it)
DROP TYPE IF EXISTS "EventType";
