-- CreateEnum
CREATE TYPE "QuizPlacement" AS ENUM ('LESSON', 'ACADEMIC');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuizGradeSinkType" AS ENUM ('NONE', 'ASSIGNMENT', 'EXAMINATION');

-- CreateEnum
CREATE TYPE "QuizResultsVisibility" AS ENUM ('AFTER_CLOSE');

-- AlterTable
ALTER TABLE "Quiz" RENAME COLUMN "duration" TO "durationMinutes";
ALTER TABLE "Quiz" RENAME COLUMN "passingScore" TO "passMark";

ALTER TABLE "Quiz"
  ADD COLUMN "placement" "QuizPlacement" NOT NULL DEFAULT 'LESSON',
  ADD COLUMN "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "courseId" UUID,
  ADD COLUMN "academicYearId" UUID,
  ADD COLUMN "termId" UUID,
  ADD COLUMN "subjectId" UUID,
  ADD COLUMN "attemptLimit" INTEGER,
  ADD COLUMN "availableFrom" TIMESTAMP(3),
  ADD COLUMN "availableUntil" TIMESTAMP(3),
  ADD COLUMN "gradeSinkType" "QuizGradeSinkType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "assignmentId" UUID,
  ADD COLUMN "examinationId" UUID,
  ADD COLUMN "resultsVisibility" "QuizResultsVisibility" NOT NULL DEFAULT 'AFTER_CLOSE';

-- AlterTable
ALTER TABLE "QuizAttempt" RENAME COLUMN "studentId" TO "submittedForStudentId";

ALTER TABLE "QuizAttempt"
  ADD COLUMN "submittedByUserId" TEXT,
  ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "officialScoreApplied" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deadlineAt" TIMESTAMP(3);

WITH ranked_attempts AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "quizId", "submittedForStudentId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM "QuizAttempt"
)
UPDATE "QuizAttempt" AS qa
SET "attemptNumber" = ranked_attempts.row_number
FROM ranked_attempts
WHERE qa."id" = ranked_attempts."id";

-- DropIndex
DROP INDEX IF EXISTS "QuizAttempt_quizId_studentId_idx";

-- CreateIndex
CREATE INDEX "Quiz_tenantId_courseId_idx" ON "Quiz"("tenantId", "courseId");
CREATE INDEX "Quiz_tenantId_subjectId_idx" ON "Quiz"("tenantId", "subjectId");
CREATE INDEX "Quiz_tenantId_placement_status_idx" ON "Quiz"("tenantId", "placement", "status");
CREATE UNIQUE INDEX "QuizAttempt_quizId_submittedForStudentId_attemptNumber_key" ON "QuizAttempt"("quizId", "submittedForStudentId", "attemptNumber");
CREATE INDEX "QuizAttempt_quizId_submittedForStudentId_idx" ON "QuizAttempt"("quizId", "submittedForStudentId");
