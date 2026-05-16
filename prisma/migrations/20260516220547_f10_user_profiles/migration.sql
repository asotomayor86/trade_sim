-- CreateEnum
CREATE TYPE "UserAuditAction" AS ENUM ('RESET_PASSWORD', 'DEACTIVATE', 'REACTIVATE', 'ROLE_CHANGE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "lastPasswordResetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" "UserAuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_audit_log_targetId_createdAt_idx" ON "user_audit_log"("targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_audit_log_actorId_createdAt_idx" ON "user_audit_log"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "user_audit_log_createdAt_idx" ON "user_audit_log"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "operations_userId_openedAt_idx" ON "operations"("userId", "openedAt" DESC);

-- AddForeignKey
ALTER TABLE "user_audit_log" ADD CONSTRAINT "user_audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_audit_log" ADD CONSTRAINT "user_audit_log_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
