import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.header('Authorization');

  if (!authorization) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (typeof secret !== 'string' || secret.length === 0) {
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  try {
    jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
