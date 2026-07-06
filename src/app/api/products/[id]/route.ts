import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductInputSchema } from "@/lib/validation/schemas";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
    const product = await prisma.product.update({
      where: { id },
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
          ? { width: parsed.data.width, height: parsed.data.height, parametricConfig: Prisma.DbNull }
          : { parametricConfig: parsed.data.parametricConfig, width: null, height: null }),
      },
    });
    return NextResponse.json(product);
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (code === "P2002")
        return NextResponse.json(
          { error: `A product with slug "${slug}" already exists` },
          { status: 400 },
        );
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e) {
      const code = (e as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
      // P2003: FK violation — product is referenced by a saved configuration
      if (code === "P2003")
        return NextResponse.json(
          { error: "This product is used in one or more saved configurations. Deactivate it instead." },
          { status: 409 },
        );
    }
    throw e;
  }
}
