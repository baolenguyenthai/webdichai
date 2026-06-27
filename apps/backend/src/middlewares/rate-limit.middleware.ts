import { Request, Response, NextFunction } from 'express';

const buckets = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX || 120);
  const key = req.ip || req.headers['x-forwarded-for']?.toString() || 'anonymous';
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > maxRequests) {
    res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    return res.status(429).json({ status: 'error', message: 'Too many requests' });
  }

  next();
};
