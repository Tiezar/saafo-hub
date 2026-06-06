-- CreateTable
CREATE TABLE "exam_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "topicName" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "examRecordId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exam_records" ADD CONSTRAINT "exam_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examRecordId_fkey" FOREIGN KEY ("examRecordId") REFERENCES "exam_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
