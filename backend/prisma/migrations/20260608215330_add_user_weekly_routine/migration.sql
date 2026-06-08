-- CreateTable
CREATE TABLE "curated_tracks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curated_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_weekly_routines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "days" INTEGER[],
    "slots" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_weekly_routines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_weekly_routines" ADD CONSTRAINT "user_weekly_routines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
