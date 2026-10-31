import 'server-only';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

/**
 * Storage abstraction:
 *  - When STORAGE_* env vars are configured → S3-compatible private object storage
 *    (Cloudflare R2, AWS S3, MinIO…) with short-lived signed download URLs.
 *  - Otherwise → local ./uploads directory (development fallback only;
 *    never rely on it on Render's ephemeral filesystem).
 */

const s3Configured = !!(
  process.env.STORAGE_ENDPOINT &&
  process.env.STORAGE_BUCKET &&
  process.env.STORAGE_ACCESS_KEY &&
  process.env.STORAGE_SECRET_KEY
);

export const STORAGE_MODE: 's3' | 'local' = s3Configured ? 's3' : 'local';

const LOCAL_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');

async function s3Client() {
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

export function makeStorageKey(prefix: string, fileName: string) {
  const ext = path.extname(fileName).toLowerCase().slice(0, 10);
  return `${prefix}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;
}

export async function saveFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
  if (STORAGE_MODE === 's3') {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  } else {
    const filePath = path.join(LOCAL_DIR, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }
}

/** Returns a short-lived signed URL (S3) or null when the file must be streamed locally. */
export async function getSignedDownloadUrl(key: string, fileName: string): Promise<string | null> {
  if (STORAGE_MODE !== 's3') return null;
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const client = await s3Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    }),
    { expiresIn: 300 }, // 5 minutes
  );
}

export async function readLocalFile(key: string): Promise<Buffer> {
  const filePath = path.join(LOCAL_DIR, key);
  if (!filePath.startsWith(LOCAL_DIR)) throw new Error('Invalid path');
  return fs.readFile(filePath);
}

export async function deleteFile(key: string): Promise<void> {
  if (STORAGE_MODE === 's3') {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await s3Client();
    await client.send(new DeleteObjectCommand({ Bucket: process.env.STORAGE_BUCKET!, Key: key }));
  } else {
    const filePath = path.join(LOCAL_DIR, key);
    await fs.unlink(filePath).catch(() => {});
  }
}

export const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
]);
export const ALLOWED_EXT = new Set(['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png']);
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB each
export const MAX_FILES = 5;
