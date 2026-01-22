-- CreateTable
CREATE TABLE IF NOT EXISTS "EngineState" (
    "id" TEXT NOT NULL,
    "aiEngineStatus" TEXT NOT NULL DEFAULT 'OFF',
    "aiEngineReason" TEXT,
    "seoEngineStatus" TEXT NOT NULL DEFAULT 'OFF',
    "seoEngineReason" TEXT,
    "schedulerStatus" TEXT NOT NULL DEFAULT 'OFF',
    "accessModeAdmin" BOOLEAN NOT NULL DEFAULT true,
    "accessModeEditor" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'EngineState_id_key'
    ) THEN
        CREATE UNIQUE INDEX "EngineState_id_key" ON "EngineState"("id");
    END IF;
END $$;
