import { asc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/client';
import { clients, vehicles } from '../db/schema';
import { HttpError } from './clients';

type VehicleInsert = typeof vehicles.$inferInsert;
type VehicleUpdate = Partial<
  Pick<VehicleInsert, 'clientId' | 'year' | 'make' | 'model' | 'vin' | 'notes'>
>;
type VehicleCreate = Pick<
  VehicleInsert,
  'clientId' | 'year' | 'make' | 'model' | 'vin' | 'notes'
>;

const router = Router();
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'string' ? value.trim() : null;
}

function normalizeOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function validateUuid(value: unknown, message: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new HttpError(400, message);
  }
  return value;
}

function getVehiclePayload(body: unknown, requireClientId: boolean): VehicleUpdate | VehicleCreate {
  if (!isRecord(body)) {
    throw new HttpError(400, 'Invalid request body');
  }

  const payload: VehicleUpdate = {};

  if ('clientId' in body) {
    payload.clientId = validateUuid(body.clientId, 'clientId is required');
  } else if (requireClientId) {
    throw new HttpError(400, 'clientId is required');
  }

  if ('year' in body) {
    payload.year = normalizeOptionalNumber(body.year);
  }

  if ('make' in body) {
    payload.make = normalizeOptionalString(body.make);
  }

  if ('model' in body) {
    payload.model = normalizeOptionalString(body.model);
  }

  if ('vin' in body) {
    payload.vin = normalizeOptionalString(body.vin);
  }

  if ('notes' in body) {
    payload.notes = typeof body.notes === 'string' ? body.notes : null;
  }

  return payload;
}

async function ensureClientExists(clientId: string) {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) {
    throw new HttpError(404, 'Not found');
  }
}

router.get('/', async (req, res, next) => {
  try {
    const clientId = req.query.clientId;

    if (clientId !== undefined && typeof clientId !== 'string') {
      throw new HttpError(400, 'clientId must be a string');
    }

    const query = db
      .select({
        id: vehicles.id,
        clientId: vehicles.clientId,
        year: vehicles.year,
        make: vehicles.make,
        model: vehicles.model,
        vin: vehicles.vin,
        notes: vehicles.notes,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
        client: {
          id: clients.id,
          name: clients.name,
        },
      })
      .from(vehicles)
      .innerJoin(clients, eq(vehicles.clientId, clients.id))
      .orderBy(asc(clients.name), asc(vehicles.year), asc(vehicles.make), asc(vehicles.model));

    const data =
      clientId && uuidPattern.test(clientId)
        ? await query.where(eq(vehicles.clientId, clientId))
        : clientId
          ? (() => {
              throw new HttpError(400, 'clientId must be a valid uuid');
            })()
          : await query;

    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = getVehiclePayload(req.body, true) as VehicleCreate;
    await ensureClientExists(payload.clientId);

    const [vehicle] = await db.insert(vehicles).values(payload).returning();
    res.status(201).json({ data: vehicle });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [vehicle] = await db
      .select({
        id: vehicles.id,
        clientId: vehicles.clientId,
        year: vehicles.year,
        make: vehicles.make,
        model: vehicles.model,
        vin: vehicles.vin,
        notes: vehicles.notes,
        createdAt: vehicles.createdAt,
        updatedAt: vehicles.updatedAt,
        client: {
          id: clients.id,
          name: clients.name,
        },
      })
      .from(vehicles)
      .innerJoin(clients, eq(vehicles.clientId, clients.id))
      .where(eq(vehicles.id, req.params.id))
      .limit(1);

    if (!vehicle) {
      throw new HttpError(404, 'Not found');
    }

    res.json({ data: vehicle });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const payload = getVehiclePayload(req.body, false);

    if (payload.clientId) {
      await ensureClientExists(payload.clientId);
    }

    const [vehicle] = await db
      .update(vehicles)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(vehicles.id, req.params.id))
      .returning();

    if (!vehicle) {
      throw new HttpError(404, 'Not found');
    }

    res.json({ data: vehicle });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await db.delete(vehicles).where(eq(vehicles.id, req.params.id)).returning({
      id: vehicles.id,
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
