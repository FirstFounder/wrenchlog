import { asc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/client';
import { clients } from '../db/schema';

type ClientInsert = typeof clients.$inferInsert;
type ClientUpdate = Partial<Pick<ClientInsert, 'name' | 'email' | 'phone' | 'notes'>>;
type ClientCreate = Pick<ClientInsert, 'name' | 'email' | 'phone' | 'notes'>;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const router = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getClientPayload(body: unknown, requireName: boolean): ClientUpdate | ClientCreate {
  if (!isRecord(body)) {
    throw new HttpError(400, 'Invalid request body');
  }

  const payload: ClientUpdate = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw new HttpError(400, 'Name is required');
    }
    payload.name = body.name.trim();
  } else if (requireName) {
    throw new HttpError(400, 'Name is required');
  }

  if ('email' in body) {
    payload.email = typeof body.email === 'string' ? body.email.trim() : null;
  }

  if ('phone' in body) {
    payload.phone = typeof body.phone === 'string' ? body.phone.trim() : null;
  }

  if ('notes' in body) {
    payload.notes = typeof body.notes === 'string' ? body.notes : null;
  }

  return payload;
}

async function getClientById(id: string) {
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return client;
}

router.get('/', async (_req, res, next) => {
  try {
    const data = await db.select().from(clients).orderBy(asc(clients.name));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = getClientPayload(req.body, true) as ClientCreate;
    const [client] = await db.insert(clients).values(payload).returning();
    res.status(201).json({ data: client });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.id);

    if (!client) {
      throw new HttpError(404, 'Not found');
    }

    res.json({ data: client });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const payload = getClientPayload(req.body, false);

    const [client] = await db
      .update(clients)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(clients.id, req.params.id))
      .returning();

    if (!client) {
      throw new HttpError(404, 'Not found');
    }

    res.json({ data: client });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await db.delete(clients).where(eq(clients.id, req.params.id)).returning({
      id: clients.id,
    });

    if (deleted.length === 0) {
      throw new HttpError(404, 'Not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { HttpError };
export default router;
