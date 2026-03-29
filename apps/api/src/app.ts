import express from 'express';
import { requireAuth } from './middleware/auth';
import authRouter from './routes/auth';
import clientsRouter, { HttpError } from './routes/clients';
import invoicesRouter from './routes/invoices';
import jobsRouter from './routes/jobs';
import mediaRouter from './routes/media';
import timeEntriesRouter from './routes/timeEntries';
import vehiclesRouter from './routes/vehicles';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      ts: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);

  app.use(requireAuth);
  app.use('/api/clients', clientsRouter);
  app.use('/api/vehicles', vehiclesRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/time-entries', timeEntriesRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/invoices', invoicesRouter);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        err instanceof HttpError
          ? err.status
          : typeof err === 'object' &&
              err !== null &&
              'status' in err &&
              typeof (err as { status?: unknown }).status === 'number'
            ? (err as { status: number }).status
            : 500;

      const message =
        err instanceof Error
          ? err.message
          : status === 500
            ? 'Internal server error'
            : 'Request failed';

      res.status(status).json({ error: message });
    },
  );

  return app;
}
