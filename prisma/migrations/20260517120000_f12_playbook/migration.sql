-- CreateEnum
CREATE TYPE "StrategySuffix" AS ENUM ('LONG', 'SHORT', 'BNC', 'UP', 'DN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'EXECUTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UnexecutedReason" AS ENUM ('EXPIRED');

-- CreateEnum
CREATE TYPE "StrategyEntryRule" AS ENUM ('EMA_CROSS_UP', 'EMA_CROSS_DOWN', 'RSI_OVERSOLD_BB_LOWER', 'BB_BREAKOUT_UP_VOLUME', 'BB_BREAKOUT_DOWN_VOLUME', 'EMA_STOCH_CROSS', 'VWAP_DEVIATION_RSI');

-- CreateEnum
CREATE TYPE "ExitTargetType" AS ENUM ('PERCENT_GAIN', 'BOLLINGER_MIDDLE', 'VWAP_TOUCH');

-- CreateEnum
CREATE TYPE "StopLossType" AS ENUM ('PERCENT', 'BOLLINGER_MIDDLE');

-- AlterTable: add code to analyses
ALTER TABLE "analyses" ADD COLUMN "code" TEXT;
CREATE UNIQUE INDEX "analyses_code_key" ON "analyses"("code");

-- AlterTable: extend operations with F12 fields
ALTER TABLE "operations"
  ADD COLUMN "orderId"          TEXT,
  ADD COLUMN "strategyId"       TEXT,
  ADD COLUMN "targetPriceExit"  DOUBLE PRECISION,
  ADD COLUMN "closedByStrategy" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "operations_orderId_key" ON "operations"("orderId");
CREATE INDEX "operations_orderId_idx" ON "operations"("orderId");
CREATE INDEX "operations_strategyId_idx" ON "operations"("strategyId");

-- CreateTable: strategies
CREATE TABLE "strategies" (
    "id"              TEXT NOT NULL,
    "code"            TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "analysisId"      TEXT NOT NULL,
    "suffix"          "StrategySuffix" NOT NULL,
    "entryRule"       "StrategyEntryRule" NOT NULL,
    "entryParams"     JSONB NOT NULL DEFAULT '{}',
    "exitTargetType"  "ExitTargetType" NOT NULL,
    "exitTargetValue" DOUBLE PRECISION NOT NULL,
    "stopLossType"    "StopLossType" NOT NULL,
    "stopLossValue"   DOUBLE PRECISION NOT NULL,
    "isStandard"      BOOLEAN NOT NULL DEFAULT false,
    "deleted"         BOOLEAN NOT NULL DEFAULT false,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById"     TEXT,

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "strategies_code_key" ON "strategies"("code");
CREATE UNIQUE INDEX "strategies_name_key" ON "strategies"("name");
CREATE UNIQUE INDEX "strategies_analysisId_suffix_key" ON "strategies"("analysisId", "suffix");

-- CreateTable: orders
CREATE TABLE "orders" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "tickerId"    TEXT NOT NULL,
    "strategyId"  TEXT NOT NULL,
    "analysisId"  TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "direction"   "Direction" NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "status"      "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "executedAt"  TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "orders_status_expiresAt_idx" ON "orders"("status", "expiresAt");
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt" DESC);

-- CreateTable: unexecuted_orders
CREATE TABLE "unexecuted_orders" (
    "id"          TEXT NOT NULL,
    "orderId"     TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "tickerId"    TEXT NOT NULL,
    "strategyId"  TEXT NOT NULL,
    "analysisId"  TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "direction"   "Direction" NOT NULL,
    "reason"      "UnexecutedReason" NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL,
    "expiredAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unexecuted_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unexecuted_orders_orderId_key" ON "unexecuted_orders"("orderId");
CREATE INDEX "unexecuted_orders_userId_expiredAt_idx" ON "unexecuted_orders"("userId", "expiredAt" DESC);

-- AddForeignKey: strategies
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: orders
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_tickerId_fkey"
  FOREIGN KEY ("tickerId") REFERENCES "tickers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: unexecuted_orders
ALTER TABLE "unexecuted_orders" ADD CONSTRAINT "unexecuted_orders_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unexecuted_orders" ADD CONSTRAINT "unexecuted_orders_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unexecuted_orders" ADD CONSTRAINT "unexecuted_orders_tickerId_fkey"
  FOREIGN KEY ("tickerId") REFERENCES "tickers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "unexecuted_orders" ADD CONSTRAINT "unexecuted_orders_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: operations → order / strategy
ALTER TABLE "operations" ADD CONSTRAINT "operations_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operations" ADD CONSTRAINT "operations_strategyId_fkey"
  FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
