-- Migration: create_pixel (Step 1 ONLY — table, no seed data)
-- Step 1: Create enums
CREATE TYPE "PixelStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'CLAIMED');
CREATE TYPE "PriceTier" AS ENUM ('BASIC', 'PREMIUM', 'STAR', 'SPECIAL');

-- Step 2: Create Pixel table
CREATE TABLE "Pixel" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "gridLat" DOUBLE PRECISION NOT NULL,
    "gridLng" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "PixelStatus" NOT NULL DEFAULT 'AVAILABLE',
    "name" TEXT,
    "color" TEXT NOT NULL DEFAULT '#818cf8',
    "message" TEXT,
    "countryCode" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "priceTier" "PriceTier" NOT NULL DEFAULT 'BASIC',
    "paymentId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pixel_pkey" PRIMARY KEY ("id")
);

-- Step 3: Indexes
CREATE UNIQUE INDEX "Pixel_gridLat_gridLng_key" ON "Pixel"("gridLat", "gridLng");
CREATE INDEX "Pixel_status_countryCode_idx" ON "Pixel"("status", "countryCode");
CREATE INDEX "Pixel_countryCode_idx" ON "Pixel"("countryCode");
