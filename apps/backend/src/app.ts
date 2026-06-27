import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import subtitleRoutes from './routes/subtitle.routes';
import docsRoutes from './routes/docs.routes';
import { rateLimit } from './middlewares/rate-limit.middleware';

import path from 'path';

const app: Express = express();

import paymentRoutes from './routes/payment.routes';
import { PaymentController } from './controllers/payment.controller';

// Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(rateLimit);

// Stripe Webhook cần Raw Body, phải đặt TRƯỚC express.json()
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), PaymentController.stripeWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Cung cấp static file cho temp folder
app.use('/temp', express.static(path.join(__dirname, '../temp')));

import adminRoutes from './routes/admin.routes';

// Routes
app.use('/api', docsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/payment', paymentRoutes); // Checkout route
app.use('/api/admin', adminRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

export default app;
