-- AlterTable: add descripcion to analyses
ALTER TABLE "analyses" ADD COLUMN "descripcion" TEXT;

-- AlterTable: add new fields to analysis_indicators
ALTER TABLE "analysis_indicators"
  ADD COLUMN "localId"    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  ADD COLUMN "lineWidth"  INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lineStyle"  INTEGER NOT NULL DEFAULT 0;

-- CreateTable: ultimo_analisis_aplicado
CREATE TABLE "ultimo_analisis_aplicado" (
    "userId"     TEXT NOT NULL,
    "tickerId"   TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "appliedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ultimo_analisis_aplicado_pkey" PRIMARY KEY ("userId","tickerId")
);

-- CreateIndex
CREATE INDEX "ultimo_analisis_aplicado_analysisId_idx" ON "ultimo_analisis_aplicado"("analysisId");

-- AddForeignKey
ALTER TABLE "ultimo_analisis_aplicado" ADD CONSTRAINT "ultimo_analisis_aplicado_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ultimo_analisis_aplicado" ADD CONSTRAINT "ultimo_analisis_aplicado_tickerId_fkey"
  FOREIGN KEY ("tickerId") REFERENCES "tickers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ultimo_analisis_aplicado" ADD CONSTRAINT "ultimo_analisis_aplicado_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
