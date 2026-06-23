-- CreateIndex
CREATE INDEX "calendar_events_userId_startAt_idx" ON "calendar_events"("userId", "startAt");

-- CreateIndex
CREATE INDEX "card_reviews_cardId_reviewedAt_idx" ON "card_reviews"("cardId", "reviewedAt");

-- CreateIndex
CREATE INDEX "card_reviews_sessionId_idx" ON "card_reviews"("sessionId");

-- CreateIndex
CREATE INDEX "cards_topicId_idx" ON "cards"("topicId");

-- CreateIndex
CREATE INDEX "cards_userId_nextReview_idx" ON "cards"("userId", "nextReview");

-- CreateIndex
CREATE INDEX "cards_userId_createdAt_idx" ON "cards"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "exam_records_userId_idx" ON "exam_records"("userId");

-- CreateIndex
CREATE INDEX "study_sessions_userId_idx" ON "study_sessions"("userId");

-- CreateIndex
CREATE INDEX "subjects_userId_idx" ON "subjects"("userId");

-- CreateIndex
CREATE INDEX "topics_subjectId_idx" ON "topics"("subjectId");
