import { and, asc, eq, isNull } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/client';
import { jobs, timeEntries } from '../db/schema';
import { HttpError } from './clients';

type TimeEntryInsert = typeof timeEntries.$inferInsert;
type TimeEntryUpdate = Partial<Pick<TimeEntryInsert, 'endedAt' | 'notes'>>;
type TimeEntryCreate = Pick<
  TimeEntryInsert,
  'jobId' | 'startedAt' | 'endedAt' | 'notes'
>;

const router = Router();
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateUuid(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new HttpError(400, `${fieldName} must be a valid uuid`);
  }

  return value;
}

function normalizeDate(
  value: unknown,
  fieldName: string,
  required: boolean,
): Date | null | undefined {
  if (value === undefined) {
    if (required) {
      throw new HttpError(400, `${fieldName} is required`);
    }

    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, `${fieldName} must be an ISO datetime`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, `${fieldName} must be an ISO datetime`);
  }

  return parsed;
}

function getCreatePayload(body: unknown): TimeEntryCreate {
  if (!isRecord(body)) {
    throw new HttpError(400, 'Invalid request body');
  }

  const payload: TimeEntryCreate = {
    jobId: validateUuid(body.jobId, 'jobId'),
    startedAt: normalizeDate(body.startedAt, 'startedAt', true) as Date,
    endedAt: normalizeDate(body.endedAt, 'endedAt', false),
    notes: typeof body.notes === 'string' ? body.notes.trim() : null,
  };

  if (
    payload.endedAt &&
    payload.startedAt &&
    payload.endedAt < payload.startedAt
  ) {
    throw new HttpError(400, 'endedAt must be after startedAt');
  }

  return payload;
}

function getUpdatePayload(body: unknown): TimeEntryUpdate {
  if (!isRecord(body)) {
    throw new HttpError(400, 'Invalid request body');
  }

  const payload: TimeEntryUpdate = {};

  if ('endedAt' in body) {
    payload.endedAt = normalizeDate(body.endedAt, 'endedAt', false);
  }

  if ('notes' in body) {
    payload.notes = typeof body.notes === 'string' ? body.notes.trim() : null;
  }

  if (!('endedAt' in body) && !('notes' in body)) {
    throw new HttpError(400, 'No valid fields provided');
  }

  return payload;
}

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

function withDurationMinutes<
  T extends { startedAt: Date | null; endedAt: Date | null },
>(entry: T) {
  return {
    ...entry,
    durationMinutes:
      entry.startedAt && entry.endedAt
        ? Math.round(
            (entry.endedAt.getTime() - entry.startedAt.getTime()) / 60_000,
          )
        : null,
  };
}

router.post('/', async (req, res, next) => {
  try {
    const payload = getCreatePayload(req.body);
    await ensureJobExists(payload.jobId);

    if (payload.endedAt == null) {
      const [runningEntry] = await db
        .select({ id: timeEntries.id })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.jobId, payload.jobId),
            isNull(timeEntries.endedAt),
          ),
        )
        .limit(1);

      if (runningEntry) {
        throw new HttpError(400, 'A running timer already exists for this job');
      }
    }

    const [entry] = await db.insert(timeEntries).values(payload).returning();
    res.status(201).json({ data: withDurationMinutes(entry) });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const jobId = validateUuid(req.query.jobId, 'jobId');
    const data = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.jobId, jobId))
      .orderBy(asc(timeEntries.startedAt));

    res.json({ data: data.map(withDurationMinutes) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const payload = getUpdatePayload(req.body);

    const [existingEntry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, req.params.id))
      .limit(1);

    if (!existingEntry) {
      throw new HttpError(404, 'Not found');
    }

    if (
      payload.endedAt &&
      existingEntry.startedAt &&
      payload.endedAt < existingEntry.startedAt
    ) {
      throw new HttpError(400, 'endedAt must be after startedAt');
    }

    const [entry] = await db
      .update(timeEntries)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(timeEntries.id, req.params.id))
      .returning();

    res.json({ data: withDurationMinutes(entry) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await db
      .delete(timeEntries)
      .where(eq(timeEntries.id, req.params.id))
      .returning({
        id: timeEntries.id,
      });

    if (deleted.length === 0) {
      throw new HttpError(404, 'Not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
