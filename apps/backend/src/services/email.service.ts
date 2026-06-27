import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP config is missing. Email not sent.', { to, subject });
    return;
  }
  await transporter.sendMail({
    from: `"AI Video Translator" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

export const sendOTP = async (to: string, otp: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Mã xác thực của bạn</h2>
      <p>Vui lòng sử dụng mã bên dưới để hoàn tất yêu cầu của bạn. Mã này có hiệu lực trong vòng 5 phút.</p>
      <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px;">${otp}</h1>
    </div>
  `;
  await sendEmail(to, 'Mã xác thực - AI Video Translator', html);
};
