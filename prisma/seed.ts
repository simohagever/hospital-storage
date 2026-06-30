import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ParametricConfigSchema } from "@/lib/validation/schemas";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// These 4 products are superseded by the single, fully-adjustable "Cell Boxes"
// product below (columns + drawers-per-column + rows + optional top shelf cover
// every shape the old fixed lockers and the old parametric cart used to need
// separate rows for).
const RETIRED_SLUGS = [
  "locker-with-top",
  "two-column-locker-with-top",
  "three-column-locker-with-top",
  "cart-with-boxes",
];

const products: Prisma.ProductCreateInput[] = [
  {
    name: "Cell Boxes",
    slug: "cell-boxes",
    category: "locker",
    dimensionType: "PARAMETRIC",
    depth: 0.455,
    defaultColor: "#6b8fa8",
    parametricConfig: {
      columns: {
        paramName: "columns",
        label: "Columns",
        min: 1,
        max: 8,
        defaultValue: 3,
      },
      drawersPerColumn: {
        paramName: "drawersPerColumn",
        label: "Drawers per column",
        min: 1,
        max: 20,
        defaultValue: 5,
      },
      rows: {
        paramName: "rows",
        label: "Rows",
        min: 1,
        max: 6,
        defaultValue: 1,
      },
      topOption: {
        paramName: "hasTop",
        label: "Top shelf",
        defaultEnabled: true,
        heightParamName: "topHeight",
        heightLabel: "Top shelf height",
        // Placeholder bounds — replace with the real measurement once available.
        minHeight: 0.05,
        maxHeight: 0.5,
        defaultHeight: 0.1,
      },
    } satisfies Prisma.InputJsonObject,
  },
];

async function retireOldProducts() {
  const retired = await prisma.product.findMany({
    where: { slug: { in: RETIRED_SLUGS } },
    select: { id: true, slug: true },
  });

  if (retired.length === 0) return;

  // onDelete: Restrict on WallConfigurationItem.product means this throws (P2003)
  // instead of silently deleting if any saved configuration still references one of
  // these products — that failure is the desired behavior here, not a bug to work
  // around with a fallback.
  await prisma.product.deleteMany({
    where: { id: { in: retired.map((p) => p.id) } },
  });

  console.log(`Retired ${retired.length} product(s): ${retired.map((p) => p.slug).join(", ")}`);
}

async function main() {
  // Fail fast, before touching the database, if any PARAMETRIC product's config
  // doesn't actually satisfy the shape/refinements ParametricConfigSchema defines
  // (e.g. a min/max typo, or two settings accidentally sharing a paramName) — the DB's
  // own CHECK constraint only verifies the 4 required keys are present, not that their
  // contents are internally consistent.
  for (const product of products) {
    if (product.dimensionType === "PARAMETRIC") {
      ParametricConfigSchema.parse(product.parametricConfig);
    }
  }

  await retireOldProducts();

  for (const { slug, ...rest } of products) {
    await prisma.product.upsert({
      where: { slug },
      update: rest,
      create: { slug, ...rest },
    });
  }

  console.log(`Seeded ${products.length} product(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
