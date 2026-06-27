import { Router } from 'express';
import express from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// /webhook (Nội bộ router gọi). app.ts đã dùng app.post('/api/payment/webhook', ...) nên bên này có thể tách riêng. 
// Nếu dùng paymentRoutes chung thì:
router.post('/webhook', PaymentController.stripeWebhook);

// Protected routes
router.use(authenticate);
router.post('/checkout', PaymentController.createCheckout);

export default router as Router;
