import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  commitImageTemp,
  deleteStoredImage,
  removeImageTemp,
  writeImageTemp,
} from "@/lib/storage/imageStore";

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

  const ext = MIME_TO_EXT[file.type] ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Write to a temp file first — atomic rename after DB commit prevents orphaned files.
  const { publicUrl, tmpPath } = await writeImageTemp(id, filename, buffer);

  try {
    // Serialise find-delete-create in a transaction so two simultaneous uploads
    // for the same product cannot both find and try to delete the same oldPrimary
    // row, which would cause the second request to throw P2025 (record not found).
    // deleteStoredImage is intentionally outside the transaction — a filesystem op
    // inside a DB transaction can hold the connection open and, if it throws, rolls
    // back the DB delete while the file may already be gone.
    let oldPrimaryUrl: string | null = null;
    const image = await prisma.$transaction(async (tx) => {
      const oldPrimary = await tx.productImage.findFirst({
        where: { productId: id, isPrimary: true },
      });
      if (oldPrimary) {
        oldPrimaryUrl = oldPrimary.url;
        await tx.productImage.delete({ where: { id: oldPrimary.id } });
      }
      return tx.productImage.create({
        data: { productId: id, url: publicUrl, kind: "FRONT", isPrimary: true },
      });
    });

    // DB committed — now safe to remove the old file. Best-effort: if it fails
    // the DB row is already gone so the file becomes unreachable anyway.
    if (oldPrimaryUrl) await deleteStoredImage(oldPrimaryUrl);

    // DB record committed — promote the temp file to its final name atomically.
    try {
      await commitImageTemp(tmpPath, id, filename);
    } catch (e) {
      await removeImageTemp(tmpPath);
      throw e;
    }
    return NextResponse.json({ id: image.id, url: image.url }, { status: 201 });
  } catch (e) {
    // DB write failed — remove the temp file so nothing leaks to disk.
    await removeImageTemp(tmpPath);
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
  await deleteStoredImage(image.url);

  try {
    await prisma.productImage.delete({ where: { id: body.imageId } });
  } catch (e: unknown) {
    // P2025: already deleted by a concurrent request — treat as idempotent success.
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2025") {
      return new NextResponse(null, { status: 204 });
    }
    throw e;
  }
  return new NextResponse(null, { status: 204 });
}
