-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "CloseReason" AS ENUM ('MANUAL', 'TP', 'SL', 'ALERT');

-- CreateEnum
CREATE TYPE "Timeframe" AS ENUM ('ONE_HOUR', 'ONE_DAY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickers" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "spreadOverridePct" DOUBLE PRECISION,

    CONSTRAINT "tickers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "bid" DOUBLE PRECISION,
    "ask" DOUBLE PRECISION,
    "last" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candles" (
    "id" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "timeframe" "Timeframe" NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "nameCustom" BOOLEAN NOT NULL DEFAULT false,
    "bias" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "isStandard" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_indicators" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "color" TEXT,
    "pane" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analysis_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_rules" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" "Direction",
    "condition" JSONB NOT NULL,
    "description" TEXT,

    CONSTRAINT "analysis_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_snapshots" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "analysisId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drawings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tickerId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "exitPrice" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION NOT NULL,
    "nominal" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "spreadApplied" DOUBLE PRECISION NOT NULL,
    "spreadSource" TEXT NOT NULL,
    "tpPrice" DOUBLE PRECISION,
    "slPrice" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION,
    "pnlPct" DOUBLE PRECISION,
    "closeReason" "CloseReason",
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,
    "tickerId" TEXT,
    "condition" JSONB NOT NULL,
    "message" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_codes_code_key" ON "invitation_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tickers_symbol_key" ON "tickers"("symbol");

-- CreateIndex
CREATE INDEX "quotes_tickerId_timestamp_idx" ON "quotes"("tickerId", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_tickerId_timestamp_key" ON "quotes"("tickerId", "timestamp");

-- CreateIndex
CREATE INDEX "candles_tickerId_timeframe_timestamp_idx" ON "candles"("tickerId", "timeframe", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "candles_tickerId_timeframe_timestamp_key" ON "candles"("tickerId", "timeframe", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "drawings_userId_tickerId_analysisId_key" ON "drawings"("userId", "tickerId", "analysisId");

-- CreateIndex
CREATE INDEX "operations_userId_closedAt_idx" ON "operations"("userId", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "tickers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candles" ADD CONSTRAINT "candles_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "tickers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_indicators" ADD CONSTRAINT "analysis_indicators_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_rules" ADD CONSTRAINT "analysis_rules_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_snapshots" ADD CONSTRAINT "analysis_snapshots_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "tickers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "tickers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "analysis_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tickerId_fkey" FOREIGN KEY ("tickerId") REFERENCES "tickers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
