-- Migration: add_checkin
-- Add Kindness Map check-in model

BEGIN;

-- Add Checkin table
CREATE TABLE "Checkin" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "photoUrl" TEXT,
    "name" TEXT NOT NULL,
    "message" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "zoomLevel" INTEGER NOT NULL DEFAULT 10,
    "countryCode" TEXT,
    "city" TEXT,
    "neighborhood" TEXT,
    "paymentId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Checkin_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Checkin_userId_idx" ON "Checkin"("userId");
CREATE INDEX "Checkin_latitude_longitude_idx" ON "Checkin"("latitude", "longitude");
CREATE INDEX "Checkin_countryCode_idx" ON "Checkin"("countryCode");
CREATE INDEX "Checkin_isVisible_idx" ON "Checkin"("isVisible");

-- Unique constraint on paymentId
CREATE UNIQUE INDEX "Checkin_paymentId_key" ON "Checkin"("paymentId")
    WHERE "paymentId" IS NOT NULL;

-- Foreign key to User
ALTER TABLE "Checkin"
    ADD CONSTRAINT "Checkin_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL;

COMMIT;
