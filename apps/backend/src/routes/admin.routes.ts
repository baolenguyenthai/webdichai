import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Response, NextFunction } from 'express';

const router = Router();

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ status: 'error', message: 'Require ADMIN role' });
  }
  next();
};

router.use(authenticate, requireAdmin);

router.get('/stats', AdminController.getStats);
router.get('/users', AdminController.getUsers);

export default router as Router;
