import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// NOTE: images are stored on the local filesystem under public/uploads/.
// This works for local dev and self-hosted deployments. For platforms with
// ephemeral storage (Vercel, Fly.io) move to a cloud bucket (S3, GCS) in v2.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Request must be multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file field named 'file' is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and GIF images are accepted" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "products", id);
  const filePath = path.join(dir, filename);
  const publicUrl = `/uploads/products/${id}/${filename}`;

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  try {
    // Delete the existing primary photo (file + DB record) before creating the
    // new one so old images don't accumulate on disk and in the database.
    const oldPrimary = await prisma.productImage.findFirst({
      where: { productId: id, isPrimary: true },
    });
    if (oldPrimary) {
      const oldPath = path.join(process.cwd(), "public", oldPrimary.url);
      await unlink(oldPath).catch(() => undefined);
      await prisma.productImage.delete({ where: { id: oldPrimary.id } });
    }

    const image = await prisma.productImage.create({
      data: { productId: id, url: publicUrl, kind: "FRONT", isPrimary: true },
    });

    return NextResponse.json({ id: image.id, url: image.url }, { status: 201 });
  } catch (e) {
    // Best-effort cleanup: if the DB write fails, remove the orphaned file so
    // disk and database stay in sync.
    await unlink(filePath).catch(() => undefined);
    throw e;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { imageId?: string };
  if (!body.imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 });

  const image = await prisma.productImage.findUnique({
    where: { id: body.imageId, productId: id },
  });
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete the physical file first (best-effort), then the DB record.
  const filePath = path.join(process.cwd(), "public", image.url);
  await unlink(filePath).catch(() => undefined);

  await prisma.productImage.delete({ where: { id: body.imageId } });
  return new NextResponse(null, { status: 204 });
}
