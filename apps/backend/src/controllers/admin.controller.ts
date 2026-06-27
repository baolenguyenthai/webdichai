import { Request, Response } from 'express';
import { prisma } from '@ai-video-translator/database';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AdminController {
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const totalUsers = await prisma.user.count();
      const totalProjects = await prisma.project.count();
      // Các query thống kê khác
      res.status(200).json({ status: 'success', data: { totalUsers, totalProjects } });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true, email: true, name: true, role: true, credits: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json({ status: 'success', data: users });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }
}
