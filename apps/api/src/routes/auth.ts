import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body as {
    username?: unknown;
    password?: unknown;
  };

  const appUsername = process.env.APP_USERNAME;
  const appPassword = process.env.APP_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (
    typeof appUsername !== 'string' ||
    appUsername.length === 0 ||
    typeof appPassword !== 'string' ||
    appPassword.length === 0 ||
    typeof jwtSecret !== 'string' ||
    jwtSecret.length === 0
  ) {
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username !== appUsername ||
    password !== appPassword
  ) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ sub: 'mechanic' }, jwtSecret, {
    expiresIn: '30d',
  });

  res.status(200).json({ token });
});

router.get('/me', requireAuth, (_req, res) => {
  res.status(200).json({ sub: 'mechanic' });
});

export default router;
