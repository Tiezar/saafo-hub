-- Add profile/scope fields to exam_records
ALTER TABLE "exam_records" ADD COLUMN IF NOT EXISTS "profileId"  TEXT;
ALTER TABLE "exam_records" ADD COLUMN IF NOT EXISTS "topicIds"   TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "exam_records" ADD COLUMN IF NOT EXISTS "scopeLabel" TEXT;

-- Add timing fields to exam_attempts
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "timeLimit" INTEGER;
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "timeTaken" INTEGER;
