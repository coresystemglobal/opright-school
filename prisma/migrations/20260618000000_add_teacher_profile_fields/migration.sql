-- AlterTable: Add profile fields and userId to Teacher
ALTER TABLE "Teacher"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "qualification" TEXT,
  ADD COLUMN "employmentDate" TIMESTAMP(3);

-- CreateIndex: Unique constraint on userId
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
