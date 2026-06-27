import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ status: 'success', data: result });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json({ status: 'success', data: result });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async googleLogin(req: Request, res: Response) {
    try {
      const { idToken } = req.body;
      const result = await AuthService.googleLogin(idToken);
      res.status(200).json({ status: 'success', data: result });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      await AuthService.forgotPassword(req.body.email);
      res.status(200).json({ status: 'success', message: 'OTP sent to email' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      await AuthService.resetPassword(req.body);
      res.status(200).json({ status: 'success', message: 'Password reset successful' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await AuthService.me(req.userId!);
      res.status(200).json({ status: 'success', data: user });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await AuthService.updateProfile(req.userId!, req.body);
      res.status(200).json({ status: 'success', data: user });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      await AuthService.changePassword(req.userId!, req.body);
      res.status(200).json({ status: 'success', message: 'Password changed successfully' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw new Error('refreshToken is required');
      const result = await AuthService.refresh(refreshToken);
      res.status(200).json({ status: 'success', data: result });
    } catch (error: any) {
      res.status(401).json({ status: 'error', message: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      await AuthService.logout(req.body.refreshToken);
      res.status(200).json({ status: 'success', message: 'Logged out' });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }
}
