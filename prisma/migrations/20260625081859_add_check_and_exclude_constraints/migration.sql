-- Coarse-but-complete DB-level safety net for Product's FIXED/PARAMETRIC duality.
-- jsonb_path_exists() is a scalar (boolean) function, not set-returning, so it's
-- allowed inside a CHECK constraint despite operating on a JSON array.
-- FIXED requires width/height/depth all present and no parametricConfig.
-- PARAMETRIC requires parametricConfig present, and for each axis (width/height/depth)
-- either a scalar fallback value or a matching entry in parametricConfig.axes.
ALTER TABLE "Product" ADD CONSTRAINT "Product_dimension_consistency" CHECK (
  (
    "dimensionType" = 'FIXED'
    AND "width" IS NOT NULL AND "height" IS NOT NULL AND "depth" IS NOT NULL
    AND "parametricConfig" IS NULL
  )
  OR
  (
    "dimensionType" = 'PARAMETRIC'
    AND "parametricConfig" IS NOT NULL
    AND ("width" IS NOT NULL OR jsonb_path_exists("parametricConfig", '$.axes[*] ? (@.axis == "width")'))
    AND ("height" IS NOT NULL OR jsonb_path_exists("parametricConfig", '$.axes[*] ? (@.axis == "height")'))
    AND ("depth" IS NOT NULL OR jsonb_path_exists("parametricConfig", '$.axes[*] ? (@.axis == "depth")'))
  )
);

-- Coarse shape check on WallConfigurationItem.params: must be a JSON object, not an
-- array/scalar, when present. Validating params against the *specific* product's
-- parametricConfig.axes requires reading another table's row, which a CHECK
-- constraint cannot do (CHECK only sees the current row) — that part stays at the
-- application/zod layer (see lib/validation/schemas.ts, Phase 2).
ALTER TABLE "WallConfigurationItem" ADD CONSTRAINT "WallConfigurationItem_params_is_object" CHECK (
  "params" IS NULL OR jsonb_typeof("params") = 'object'
);

-- Floor on actualWidth/actualHeight: the no-overlap constraint below shrinks each
-- box by 1mm per side before comparing. If a near-zero-size row ever slipped in
-- (e.g. a draft/placeholder row written before real computation), that shrink
-- would invert the box; Postgres's box type silently normalizes inverted corners
-- rather than erroring, which would turn a "no size" row into a phantom ~2mm box
-- that could spuriously collide with a real neighboring item. Requiring strictly
-- more than 2mm (= 2x the shrink) makes that inversion impossible.
ALTER TABLE "PlacedItemInstance" ADD CONSTRAINT "PlacedItemInstance_min_size" CHECK (
  "actualWidth" > 0.002 AND "actualHeight" > 0.002
);

-- Prevent two PlacedItemInstance rows in the same WallConfiguration from occupying
-- overlapping 2D space — a last-resort guard against a packing-algorithm bug
-- producing visually "stacked" ghost shelves. btree_gist supplies a GiST opclass for
-- the text equality check so it can combine with the box's native GiST overlap
-- operator (&&) in one exclusion constraint.
--
-- Each box is shrunk by 1mm on every side before comparing: the packing algorithm
-- routinely places items edge-to-edge (one item's right edge exactly touching the
-- next item's left edge), and Postgres's box && operator treats merely-touching
-- boxes as overlapping. Without the shrink, every normal, correct layout would
-- violate this constraint. 1mm is small enough that it will never mask a real
-- overlap bug (those overlap by centimeters, not fractions of a millimeter).
-- Verified directly against this Postgres instance: touching boxes insert
-- successfully, a genuinely overlapping box is rejected with a clear error.
--
-- NOTE on deployment: CREATE EXTENSION requires elevated privileges on some managed
-- Postgres providers (Supabase/Neon/RDS); if this statement fails in production,
-- enable btree_gist via the provider's dashboard/console instead, then re-run the
-- rest of this migration.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "PlacedItemInstance" ADD CONSTRAINT "PlacedItemInstance_no_overlap" EXCLUDE USING gist (
  "configurationId" WITH =,
  (box(
    point("positionX" + 0.001, "positionY" + 0.001),
    point("positionX" + "actualWidth" - 0.001, "positionY" + "actualHeight" - 0.001)
  )) WITH &&
);
