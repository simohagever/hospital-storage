-- Defense-in-depth positivity checks. The application layer (zod) is the primary
-- gate, but these guard against any write path that bypasses it (internal scripts,
-- future bugs). The 4 seeded products already satisfy all of these.
ALTER TABLE "WallConfiguration" ADD CONSTRAINT "WallConfiguration_positive_dimensions" CHECK (
  "wallWidth" > 0 AND "wallHeight" > 0
);

ALTER TABLE "WallConfigurationItem" ADD CONSTRAINT "WallConfigurationItem_quantity_positive" CHECK (
  "quantity" >= 1
);

ALTER TABLE "Product" ADD CONSTRAINT "Product_dimensions_positive" CHECK (
  ("width" IS NULL OR "width" > 0)
  AND ("height" IS NULL OR "height" > 0)
  AND ("depth" IS NULL OR "depth" > 0)
);

-- At most one primary image per product. Without this, two ProductImage rows could
-- both have isPrimary = true for the same product, making "which photo shows in the
-- catalog" ambiguous. The admin upload flow (Phase 5) must set the old primary's
-- isPrimary to false in the same transaction as setting a new one true, or this
-- constraint will reject the write.
CREATE UNIQUE INDEX "ProductImage_one_primary_per_product" ON "ProductImage" ("productId") WHERE "isPrimary" = true;

-- PlacedItemInstance.configurationId is a denormalized copy of its
-- configurationItem's configurationId (see schema.prisma comment) — it exists only
-- so the no-overlap EXCLUDE constraint can partition by configuration. If the
-- application ever wrote a mismatched value here (bug, bad bulk update), the
-- overlap check would silently compare a row against the wrong configuration's
-- geometry. This trigger makes that drift structurally impossible: configurationId
-- is always re-derived from configurationItemId, regardless of what the application
-- sets it to.
CREATE OR REPLACE FUNCTION sync_placed_item_instance_configuration_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT "configurationId" INTO NEW."configurationId"
  FROM "WallConfigurationItem"
  WHERE "id" = NEW."configurationItemId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PlacedItemInstance_sync_configurationId"
BEFORE INSERT OR UPDATE OF "configurationItemId" ON "PlacedItemInstance"
FOR EACH ROW
EXECUTE FUNCTION sync_placed_item_instance_configuration_id();
