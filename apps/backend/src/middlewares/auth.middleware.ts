import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '@ai-video-translator/database';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.userId;
    
    // Fetch role từ DB
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } });
    if (user) req.userRole = user.role;

    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid or expired token' });
  }
};
