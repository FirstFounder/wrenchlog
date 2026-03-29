import express from 'express';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      ts: new Date().toISOString(),
    });
  });

  return app;
}
