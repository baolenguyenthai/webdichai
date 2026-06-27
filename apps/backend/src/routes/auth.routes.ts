import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router: Router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google', AuthController.googleLogin);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);
router.patch('/profile', authenticate, AuthController.updateProfile);
router.post('/change-password', authenticate, AuthController.changePassword);

export default router;
