-- AlterTable
ALTER TABLE "users" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'FREE_TRIAL';
ALTER TABLE "users" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "asaasCustomerId" TEXT;
ALTER TABLE "users" ADD COLUMN "asaasSubscriptionId" TEXT;

-- Update existing users: set trialEndsAt to 14 days from now
UPDATE "users" SET "trialEndsAt" = NOW() + INTERVAL '14 days' WHERE "trialEndsAt" IS NULL;

-- CreateTable
CREATE TABLE "insight_caches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_caches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_asaasCustomerId_key" ON "users"("asaasCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "insight_caches_userId_key" ON "insight_caches"("userId");

-- AddForeignKey
ALTER TABLE "insight_caches" ADD CONSTRAINT "insight_caches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
