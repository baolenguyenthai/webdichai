import Stripe from 'stripe';
import { prisma } from '@ai-video-translator/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-06-24.dahlia' as any,
});

const PACKAGES = {
  basic: { amount: 1000, credits: 100, name: 'Gói Cơ Bản (100 Credits)' },
  pro: { amount: 5000, credits: 600, name: 'Gói Pro (600 Credits)' },
};

export class PaymentService {
  static async createCheckoutSession(userId: string, packageType: 'basic' | 'pro') {
    const pkg = PACKAGES[packageType];
    if (!pkg) throw new Error('Invalid package');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: userId,
      metadata: {
        credits: pkg.credits,
        userId: userId,
      },
      line_items: [
        {
          price_data: {
            currency: 'vnd',
            product_data: {
              name: pkg.name,
              description: `Nạp ${pkg.credits} credits vào tài khoản AI Video Translator.`,
            },
            unit_amount: pkg.amount * 100, // Stripe expects smallest currency unit
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard?payment=cancel`,
    });

    return session.url;
  }

  static async handleWebhook(signature: string, payload: any) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      throw new Error(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || '0', 10);

      if (userId && credits > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            credits: { increment: credits },
            stripeCustomerId: session.customer as string,
          }
        });
        console.log(`Đã cộng ${credits} credits cho user ${userId} từ thanh toán Stripe.`);
      }
    }
    
    return { received: true };
  }
}
