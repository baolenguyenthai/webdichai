import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@webdichai.com' },
    update: {},
    create: {
      email: 'admin@webdichai.com',
      name: 'Admin WebDichAI',
      password: adminPassword,
      role: 'ADMIN',
      credits: 99999
    }
  });

  const userPassword = await bcrypt.hash('user123', 10);
  await prisma.user.upsert({
    where: { email: 'user@webdichai.com' },
    update: {},
    create: {
      email: 'user@webdichai.com',
      name: 'Test User',
      password: userPassword,
      role: 'USER',
      credits: 500
    }
  });

  console.log('✅ Đã tạo thành công tài khoản Admin và User mẫu!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
