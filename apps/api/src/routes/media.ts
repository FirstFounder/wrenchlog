import { asc, eq } from 'drizzle-orm';
import express, { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { db } from '../db/client';
import { jobs, mediaAssets } from '../db/schema';
import { HttpError } from './clients';

type UploadRequest = express.Request & {
  mediaAssetId?: string;
};

const router = Router();
const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);
const maxFileSize = 20 * 1024 * 1024;
const uploadRoot = '/data/uploads';
const mimeExtensions: Record<string, string> = {
  'image/heic': '.heic',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateUuid(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new HttpError(400, `${fieldName} must be a valid uuid`);
  }

  return value;
}

function getExtension(file: Express.Multer.File): string {
  const originalExtension = path.extname(file.originalname).toLowerCase();

  if (originalExtension) {
    return originalExtension;
  }

  return mimeExtensions[file.mimetype] ?? '';
}

const storage = multer.diskStorage({
  destination(req, _file, callback) {
    const jobId = req.body.jobId;

    try {
      validateUuid(jobId, 'jobId');
    } catch (error) {
      callback(error as Error, uploadRoot);
      return;
    }

    const uploadDirectory = path.join(uploadRoot, jobId);
    fs.mkdir(uploadDirectory, { recursive: true })
      .then(() => callback(null, uploadDirectory))
      .catch((error: unknown) => callback(error as Error, uploadDirectory));
  },
  filename(req, file, callback) {
    const uploadRequest = req as UploadRequest;
    const mediaAssetId = uploadRequest.mediaAssetId ?? randomUUID();
    uploadRequest.mediaAssetId = mediaAssetId;
    callback(null, `${mediaAssetId}${getExtension(file)}`);
  },
});

const upload = multer({
  storage,
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new HttpError(400, 'Unsupported file type'));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: maxFileSize,
  },
});

async function ensureJobExists(jobId: string) {
  const [job] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new HttpError(404, 'Job not found');
  }
}

function handleUploadError(error: unknown): Error {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new HttpError(400, 'File size must be 20MB or less');
    }

    return new HttpError(400, error.message);
  }

  return error instanceof Error ? error : new Error('Upload failed');
}

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, async (error) => {
    if (error) {
      next(handleUploadError(error));
      return;
    }

    try {
      const uploadRequest = req as UploadRequest;
      const jobId = validateUuid(req.body.jobId, 'jobId');
      const file = req.file;

      if (!file || !uploadRequest.mediaAssetId) {
        throw new HttpError(400, 'file is required');
      }

      await ensureJobExists(jobId);

      const [asset] = await db
        .insert(mediaAssets)
        .values({
          id: uploadRequest.mediaAssetId,
          jobId,
          type: 'photo',
          storagePath: file.path,
          mimeType: file.mimetype,
        })
        .returning({
          id: mediaAssets.id,
          type: mediaAssets.type,
          mimeType: mediaAssets.mimeType,
          createdAt: mediaAssets.createdAt,
        });

      res.status(201).json({ data: asset });
    } catch (uploadError) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => undefined);
      }
      next(uploadError);
    }
  });
});

router.get('/', async (req, res, next) => {
  try {
    const jobId = validateUuid(req.query.jobId, 'jobId');
    const data = await db
      .select({
        id: mediaAssets.id,
        type: mediaAssets.type,
        mimeType: mediaAssets.mimeType,
        createdAt: mediaAssets.createdAt,
      })
      .from(mediaAssets)
      .where(eq(mediaAssets.jobId, jobId))
      .orderBy(asc(mediaAssets.createdAt));

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get('/:assetId', async (req, res, next) => {
  try {
    const [asset] = await db
      .select({
        storagePath: mediaAssets.storagePath,
        mimeType: mediaAssets.mimeType,
      })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, req.params.assetId))
      .limit(1);

    if (!asset?.storagePath) {
      throw new HttpError(404, 'Not found');
    }

    if (asset.mimeType) {
      res.type(asset.mimeType);
    }

    res.sendFile(asset.storagePath);
  } catch (error) {
    next(error);
  }
});

router.delete('/:assetId', async (req, res, next) => {
  try {
    const [asset] = await db
      .select({
        id: mediaAssets.id,
        storagePath: mediaAssets.storagePath,
      })
      .from(mediaAssets)
      .where(eq(mediaAssets.id, req.params.assetId))
      .limit(1);

    if (!asset) {
      throw new HttpError(404, 'Not found');
    }

    if (asset.storagePath) {
      await fs
        .unlink(asset.storagePath)
        .catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        });
    }

    await db.delete(mediaAssets).where(eq(mediaAssets.id, req.params.assetId));

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
