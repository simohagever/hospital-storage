-- depth becomes a required (non-nullable) column directly in schema.prisma (this is
-- the Prisma-native way to express "always present" — it also keeps the generated
-- TypeScript type as `number` instead of `number | null`, so the app layer can't
-- drift out of sync with what the database actually enforces).
ALTER TABLE "Product" ALTER COLUMN "depth" SET NOT NULL;

-- width/height can't be made unconditionally required the same way: whether they're
-- required depends on dimensionType, a sibling column, which a plain nullable/
-- non-nullable column can't express — hence raw SQL. This closes the gap the earlier
-- positivity-only check left: a FIXED product saved with width/height left NULL would
-- otherwise only fail later, at render time, with a LayoutEngineError, instead of
-- being rejected at write time.
ALTER TABLE "Product" ADD CONSTRAINT "Product_fixed_requires_width_height" CHECK (
  "dimensionType" != 'FIXED' OR ("width" IS NOT NULL AND "height" IS NOT NULL)
);
