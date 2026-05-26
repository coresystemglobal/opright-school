import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../observability';

const errorLog = logger.child({ module: 'errorHandler' });

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
  }

  errorLog.error({
    msg: 'Unhandled error',
    err: { message: err.message, name: err.name, stack: err.stack },
    method: req.method,
    path: req.path,
    tenantId: req.tenantId,
    userId: req.user?.userId,
  });

  res.status(500).json({ error: 'Internal server error' });
};
