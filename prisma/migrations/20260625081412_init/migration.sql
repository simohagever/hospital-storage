-- CreateEnum
CREATE TYPE "DimensionType" AS ENUM ('FIXED', 'PARAMETRIC');

-- CreateEnum
CREATE TYPE "ConfigurationStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ImageKind" AS ENUM ('FRONT', 'ICON', 'GALLERY');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "dimensionType" "DimensionType" NOT NULL DEFAULT 'FIXED',
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "parametricConfig" JSONB,
    "defaultColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "ImageKind" NOT NULL DEFAULT 'FRONT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallConfiguration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wallWidth" DOUBLE PRECISION NOT NULL,
    "wallHeight" DOUBLE PRECISION NOT NULL,
    "status" "ConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "fits" BOOLEAN,
    "usedWidth" DOUBLE PRECISION,
    "usedHeight" DOUBLE PRECISION,
    "warnings" JSONB,
    "layoutComputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WallConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WallConfigurationItem" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "params" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WallConfigurationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacedItemInstance" (
    "id" TEXT NOT NULL,
    "configurationItemId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "instanceKey" TEXT NOT NULL,
    "actualWidth" DOUBLE PRECISION NOT NULL,
    "actualHeight" DOUBLE PRECISION NOT NULL,
    "actualDepth" DOUBLE PRECISION NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "positionZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rowIndex" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacedItemInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "WallConfigurationItem_configurationId_idx" ON "WallConfigurationItem"("configurationId");

-- CreateIndex
CREATE INDEX "WallConfigurationItem_productId_idx" ON "WallConfigurationItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacedItemInstance_instanceKey_key" ON "PlacedItemInstance"("instanceKey");

-- CreateIndex
CREATE INDEX "PlacedItemInstance_configurationItemId_idx" ON "PlacedItemInstance"("configurationItemId");

-- CreateIndex
CREATE INDEX "PlacedItemInstance_configurationId_idx" ON "PlacedItemInstance"("configurationId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallConfigurationItem" ADD CONSTRAINT "WallConfigurationItem_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "WallConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WallConfigurationItem" ADD CONSTRAINT "WallConfigurationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacedItemInstance" ADD CONSTRAINT "PlacedItemInstance_configurationItemId_fkey" FOREIGN KEY ("configurationItemId") REFERENCES "WallConfigurationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
