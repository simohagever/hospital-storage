-- The original Product_dimension_consistency constraint (migration
-- 20260625081859_add_check_and_exclude_constraints) was written for the old generic
-- "parametricConfig.axes[]" shape and checked for entries like
-- {"axis": "width", ...} inside an axes array. The catalog redesign replaced that
-- with a bespoke, named-field shape ({columns, drawersPerColumn, rows, topOption}) —
-- there is no axes array anymore, so the old constraint's PARAMETRIC branch can never
-- be satisfied and incorrectly rejects every valid PARAMETRIC product (e.g. "Cell
-- Boxes", whose width/height are legitimately null and computed at read time).
--
-- depth is no longer part of this constraint: it's already unconditionally required
-- via the NOT NULL column constraint (set in migration
-- 20260627120000_require_product_dimensions), so it doesn't depend on dimensionType
-- and doesn't belong in a CHECK that's specifically about the FIXED/PARAMETRIC split.
--
-- This also subsumes the narrower Product_fixed_requires_width_height constraint
-- added in that same migration, and additionally requires width/height to be NULL
-- when PARAMETRIC (closing the converse gap: nothing previously stopped a PARAMETRIC
-- row from also carrying stale width/height values, which dimensions.ts's PARAMETRIC
-- branch never reads — so they'd silently go stale instead of erroring, contradicting
-- this column's own documented contract in schema.prisma).
ALTER TABLE "Product" DROP CONSTRAINT "Product_fixed_requires_width_height";
ALTER TABLE "Product" DROP CONSTRAINT "Product_dimension_consistency";

-- jsonb's `?&` operator checks that every key in the given array exists as a
-- top-level key of the JSON object — exactly the coarse "right shape" check this
-- constraint is meant to provide. Validating the *contents* of each key (min/max/
-- defaultValue ranges, paramName uniqueness, etc.) stays at the application layer via
-- ParametricConfigSchema (lib/validation/schemas.ts), same division of responsibility
-- as the original constraint's comment described. (parametricConfig is already JSONB,
-- not json, per the original init migration — no column type change needed.)
ALTER TABLE "Product" ADD CONSTRAINT "Product_dimension_consistency" CHECK (
  (
    "dimensionType" = 'FIXED'
    AND "width" IS NOT NULL AND "height" IS NOT NULL
    AND "parametricConfig" IS NULL
  )
  OR
  (
    "dimensionType" = 'PARAMETRIC'
    AND "width" IS NULL AND "height" IS NULL
    AND "parametricConfig" IS NOT NULL
    AND "parametricConfig" ?& ARRAY['columns', 'drawersPerColumn', 'rows', 'topOption']
  )
);
