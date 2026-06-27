import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class PaymentController {
  static async createCheckout(req: AuthenticatedRequest, res: Response) {
    try {
      const { packageType } = req.body;
      if (!['basic', 'pro'].includes(packageType)) {
        throw new Error('Invalid package type');
      }

      const sessionUrl = await PaymentService.createCheckoutSession(req.userId!, packageType as 'basic' | 'pro');
      res.status(200).json({ status: 'success', data: { url: sessionUrl } });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async stripeWebhook(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    // Webhook payload requires raw buffer, which we'll handle in route configuration
    const payload = req.body; 

    try {
      const result = await PaymentService.handleWebhook(signature, payload);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
}
