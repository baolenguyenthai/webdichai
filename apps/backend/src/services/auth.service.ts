import { prisma } from '@ai-video-translator/database';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateTokens } from '../utils/jwt';
import { sendOTP } from './email.service';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
  static async generateOTP(email: string, type: 'REGISTER' | 'FORGOT_PASSWORD', userId?: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await prisma.oTP.create({
      data: {
        email,
        code,
        type,
        expiresAt,
        userId,
      },
    });

    await sendOTP(email, code);
  }

  static async register(data: any) {
    const { email, password, name } = data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email already exists');

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const tokens = generateTokens(user.id);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    return { user: { id: user.id, email: user.email, name: user.name }, tokens };
  }

  static async login(data: any) {
    const { email, password } = data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new Error('Invalid credentials');

    const valid = await comparePassword(password, user.password);
    if (!valid) throw new Error('Invalid credentials');

    const tokens = generateTokens(user.id);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    });

    return { user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }, tokens };
  }

  static async googleLogin(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) throw new Error('Invalid Google Token');

    let user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name,
          avatar: payload.picture,
          googleId: payload.sub,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub, avatar: user.avatar || payload.picture },
      });
    }

    const tokens = generateTokens(user.id);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    });

    return { user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar }, tokens };
  }

  static async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    await this.generateOTP(email, 'FORGOT_PASSWORD', user.id);
  }

  static async resetPassword(data: any) {
    const { email, code, newPassword } = data;
    const otp = await prisma.oTP.findFirst({
      where: { email, code, type: 'FORGOT_PASSWORD', expiresAt: { gt: new Date() } },
    });

    if (!otp) throw new Error('Invalid or expired OTP');

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await prisma.oTP.delete({ where: { id: otp.id } });
  }
}
