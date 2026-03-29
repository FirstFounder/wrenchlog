import { and, eq, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/client';
import { clients, jobs, vehicles } from '../db/schema';
import { HttpError } from './clients';

type JobInsert = typeof jobs.$inferInsert;
type JobUpdate = Partial<
  Pick<JobInsert, 'vehicleId' | 'title' | 'status' | 'openedAt' | 'closedAt' | 'notes'>
>;
type JobCreate = Pick<
  JobInsert,
  'vehicleId' | 'title' | 'status' | 'openedAt' | 'closedAt' | 'notes'
>;

const router = Router();
const validStatuses = ['open', 'in_progress', 'complete', 'invoiced'] as const;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateUuid(value: unknown, message: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new HttpError(400, message);
  }
  return value;
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'string' ? value.trim() : null;
}

function normalizeOptionalDate(value: unknown, fieldName: string): Date | null | undefined {
  if (value === undefined) {
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

function validateStatus(value: unknown): JobInsert['status'] {
  if (typeof value !== 'string' || !validStatuses.includes(value as (typeof validStatuses)[number])) {
    throw new HttpError(400, 'Invalid status');
  }
  return value;
}

function getJobPayload(body: unknown, isCreate: boolean): JobUpdate | JobCreate {
  if (!isRecord(body)) {
    throw new HttpError(400, 'Invalid request body');
  }

  const payload: JobUpdate = {};

  if ('vehicleId' in body) {
    payload.vehicleId = validateUuid(body.vehicleId, 'vehicleId is required');
  } else if (isCreate) {
    throw new HttpError(400, 'vehicleId is required');
  }

  if ('title' in body) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw new HttpError(400, 'Title is required');
    }
    payload.title = body.title.trim();
  } else if (isCreate) {
    throw new HttpError(400, 'Title is required');
  }

  if ('status' in body) {
    payload.status = validateStatus(body.status);
  } else if (isCreate) {
    payload.status = 'open';
  }

  if ('openedAt' in body) {
    payload.openedAt = normalizeOptionalDate(body.openedAt, 'openedAt');
  } else if (isCreate) {
    payload.openedAt = new Date();
  }

  if ('closedAt' in body) {
    payload.closedAt = normalizeOptionalDate(body.closedAt, 'closedAt');
  }

  if ('notes' in body) {
    payload.notes = typeof body.notes === 'string' ? body.notes : null;
  }

  return payload;
}

async function ensureVehicleExists(vehicleId: string) {
  const [vehicle] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1);

  if (!vehicle) {
    throw new HttpError(404, 'Not found');
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { vehicleId, status } = req.query;

    if (vehicleId !== undefined && (typeof vehicleId !== 'string' || !uuidPattern.test(vehicleId))) {
      throw new HttpError(400, 'vehicleId must be a valid uuid');
    }

    if (status !== undefined && typeof status !== 'string') {
      throw new HttpError(400, 'status must be a string');
    }

    const filters = [];
    if (vehicleId) {
      filters.push(eq(jobs.vehicleId, vehicleId));
    }
    if (status) {
      filters.push(eq(jobs.status, status));
    }

    const data = await db
      .select({
        id: jobs.id,
        vehicleId: jobs.vehicleId,
        title: jobs.title,
        status: jobs.status,
        openedAt: jobs.openedAt,
        closedAt: jobs.closedAt,
        notes: jobs.notes,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        vehicle: {
          id: vehicles.id,
          year: vehicles.year,
          make: vehicles.make,
          model: vehicles.model,
        },
        client: {
          id: clients.id,
          name: clients.name,
        },
      })
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(clients, eq(vehicles.clientId, clients.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(sql`${jobs.openedAt} desc nulls last`);

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = getJobPayload(req.body, true) as JobCreate;
    await ensureVehicleExists(payload.vehicleId);

    const [job] = await db.insert(jobs).values(payload).returning();
    res.status(201).json({ data: job });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [job] = await db
      .select({
        id: jobs.id,
        vehicleId: jobs.vehicleId,
        title: jobs.title,
        status: jobs.status,
        openedAt: jobs.openedAt,
        closedAt: jobs.closedAt,
        notes: jobs.notes,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
        vehicle: {
          id: vehicles.id,
          clientId: vehicles.clientId,
          year: vehicles.year,
          make: vehicles.make,
          model: vehicles.model,
          vin: vehicles.vin,
          notes: vehicles.notes,
          createdAt: vehicles.createdAt,
          updatedAt: vehicles.updatedAt,
        },
        clientId: clients.id,
        clientName: clients.name,
      })
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(clients, eq(vehicles.clientId, clients.id))
      .where(eq(jobs.id, req.params.id))
      .limit(1);

    if (!job) {
      throw new HttpError(404, 'Not found');
    }

    res.json({
      data: {
        id: job.id,
        vehicleId: job.vehicleId,
        title: job.title,
        status: job.status,
        openedAt: job.openedAt,
        closedAt: job.closedAt,
        notes: job.notes,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        vehicle: {
          id: job.vehicle.id,
          clientId: job.vehicle.clientId,
          year: job.vehicle.year,
          make: job.vehicle.make,
          model: job.vehicle.model,
          vin: job.vehicle.vin,
          notes: job.vehicle.notes,
          createdAt: job.vehicle.createdAt,
          updatedAt: job.vehicle.updatedAt,
          client: {
            id: job.clientId,
            name: job.clientName,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const payload = getJobPayload(req.body, false);

    if (payload.vehicleId) {
      await ensureVehicleExists(payload.vehicleId);
    }

    const [job] = await db
      .update(jobs)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(jobs.id, req.params.id))
      .returning();

    if (!job) {
      throw new HttpError(404, 'Not found');
    }

    res.json({ data: job });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await db.delete(jobs).where(eq(jobs.id, req.params.id)).returning({
      id: jobs.id,
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
