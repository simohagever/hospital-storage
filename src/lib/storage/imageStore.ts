import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Local filesystem implementation of image storage.
//
// To migrate to cloud storage (S3, GCS, Cloudflare R2):
//   1. Implement writeImageTemp, commitImageTemp, removeImageTemp, deleteStoredImage
//      using the relevant SDK (e.g. @aws-sdk/client-s3).
//   2. Replace the function bodies in this file — the image API route imports
//      only these four functions and never touches fs or any SDK directly, so
//      the route does not need to change at all.
//
// publicUrl convention:
//   Local:  /uploads/products/<productId>/<filename>   (served by Next.js from public/)
//   Cloud:  https://storage.example.com/<bucket>/<key> (full URL returned by SDK)
// The ProductImage.url column stores whichever form is active.

function uploadsDir(productId: string): string {
  return path.join(process.cwd(), "public", "uploads", "products", productId);
}

/**
 * Write buffer to a temporary file and return the public URL and temp path.
 * Call commitImageTemp on success or removeImageTemp on failure.
 */
export async function writeImageTemp(
  productId: string,
  filename: string,
  buffer: Buffer,
): Promise<{ publicUrl: string; tmpPath: string }> {
  const dir = uploadsDir(productId);
  const finalPath = path.join(dir, filename);
  const tmpPath = `${finalPath}.tmp`;
  await mkdir(dir, { recursive: true });
  await writeFile(tmpPath, buffer);
  return { publicUrl: `/uploads/products/${productId}/${filename}`, tmpPath };
}

/**
 * Atomically promote the temp file to its final name after the DB record is committed.
 */
export async function commitImageTemp(
  tmpPath: string,
  productId: string,
  filename: string,
): Promise<void> {
  const finalPath = path.join(uploadsDir(productId), filename);
  await rename(tmpPath, finalPath);
}

/**
 * Remove the temp file if the DB write failed — prevents orphaned files.
 */
export async function removeImageTemp(tmpPath: string): Promise<void> {
  await unlink(tmpPath).catch(() => undefined);
}

/**
 * Delete a previously committed image by its stored publicUrl.
 */
export async function deleteStoredImage(publicUrl: string): Promise<void> {
  await unlink(path.join(process.cwd(), "public", publicUrl)).catch(() => undefined);
}
