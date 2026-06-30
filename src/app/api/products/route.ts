import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductInputSchema } from "@/lib/validation/schemas";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { images: true } } },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = ProductInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { dimensionType, slug, name, category, description, defaultColor, isActive, depth } =
    parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        slug,
        name,
        category,
        description,
        defaultColor,
        isActive,
        depth,
        dimensionType,
        ...(dimensionType === "FIXED"
          ? { width: parsed.data.width, height: parsed.data.height }
          : { parametricConfig: parsed.data.parametricConfig }),
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: `A product with slug "${slug}" already exists` },
        { status: 400 },
      );
    }
    throw e;
  }
}
