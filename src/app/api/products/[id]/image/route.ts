import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Map validated MIME type → file extension so the stored filename extension
// always reflects reality, regardless of what the client chose to name the file.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ALLOWED_TYPES = Object.keys(MIME_TO_EXT);

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

  // Derive extension from the validated MIME type — never trust the client filename.
  const ext = MIME_TO_EXT[file.type] ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "products", id);
  const finalPath = path.join(dir, filename);
  const tmpPath = `${finalPath}.tmp`;
  const publicUrl = `/uploads/products/${id}/${filename}`;

  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  // Write to a temp file first. The rename below is atomic on POSIX — if anything
  // between here and the DB commit fails, no permanent file is left on disk.
  await writeFile(tmpPath, buffer);

  try {
    // Serialise find-delete-create in a transaction so two simultaneous uploads
    // for the same product cannot both find and try to delete the same oldPrimary
    // row, which would cause the second request to throw P2025 (record not found).
    const image = await prisma.$transaction(async (tx) => {
      const oldPrimary = await tx.productImage.findFirst({
        where: { productId: id, isPrimary: true },
      });
      if (oldPrimary) {
        await tx.productImage.delete({ where: { id: oldPrimary.id } });
        // Best-effort file removal — after the DB record is gone the file is
        // unreachable even if unlink fails (e.g. permissions), so don't let a
        // failed unlink abort the transaction.
        const oldFilePath = path.join(process.cwd(), "public", oldPrimary.url);
        await unlink(oldFilePath).catch(() => undefined);
      }
      return tx.productImage.create({
        data: { productId: id, url: publicUrl, kind: "FRONT", isPrimary: true },
      });
    });

    // DB record committed — promote the temp file to its final name atomically.
    await rename(tmpPath, finalPath);
    return NextResponse.json({ id: image.id, url: image.url }, { status: 201 });
  } catch (e) {
    // DB write failed — remove the temp file so nothing leaks to disk.
    await unlink(tmpPath).catch(() => undefined);
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
