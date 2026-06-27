import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { getIO } from '../config/socket';
import { prisma } from '@ai-video-translator/database';
import { TranslateService } from '../services/translate.service';
import fs from 'fs';
import path from 'path';

const tempDir = path.join(__dirname, '../../temp');

export const translateWorker = new Worker(
  'translateProcessing',
  async (job) => {
    const { projectId, targetLang } = job.data;
    console.log(`Bắt đầu dịch Project ${projectId} sang ngôn ngữ ${targetLang}...`);
    
    const io = getIO();
    const notify = (status: string, percent: number) => {
      io.to(`project_${projectId}`).emit('processProgress', { projectId, status, percent });
    };

    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'TRANSLATING', targetLang },
      });
      notify('TRANSLATING', 10);

      // 1. Lấy tất cả subtitle gốc
      const subtitles = await prisma.subtitle.findMany({
        where: { projectId },
        orderBy: { startTime: 'asc' },
      });

      if (subtitles.length === 0) throw new Error('No subtitles found');

      // 2. Dịch tất cả qua AI
      notify('TRANSLATING', 30);
      const translatedSubtitles = await TranslateService.translateSubtitles(subtitles, targetLang);
      
      // Cập nhật DB
      for (const sub of translatedSubtitles) {
        await prisma.subtitle.update({
          where: { id: sub.id },
          data: { translatedText: sub.translatedText },
        });
      }
      notify('TRANSLATED', 60);

      // 3. Text to Speech cho từng đoạn (Voice Cloning)
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'DUBBING' },
      });
      notify('DUBBING', 70);

      const totalSubs = translatedSubtitles.length;
      for (let i = 0; i < totalSubs; i++) {
        const sub = translatedSubtitles[i];
        if (sub.translatedText) {
          try {
            const audioBuffer = await TranslateService.generateSpeech(sub.translatedText);
            const audioName = `${projectId}_sub_${sub.id}.mp3`;
            const audioPath = path.join(tempDir, audioName);
            fs.writeFileSync(audioPath, audioBuffer);
            
            // TODO: Đẩy file này lên Cloudinary và lưu URL vào DB, ở đây ghi tạm URL local mock
            await prisma.subtitle.update({
              where: { id: sub.id },
              data: { audioUrl: `/temp/${audioName}` },
            });
          } catch (e) {
            console.error(`TTS Failed for subtitle ${sub.id}`, e);
          }
        }
        notify('DUBBING', 70 + Math.floor(((i + 1) / totalSubs) * 20));
      }

      // 4. Hoàn thành
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'COMPLETED' },
      });
      notify('COMPLETED', 100);
      
      console.log(`Hoàn thành Dịch và Lồng tiếng cho Project ${projectId}`);

    } catch (error) {
      console.error('Lỗi Translate/Dubbing Worker:', error);
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });
      notify('FAILED', 0);
      throw error;
    }
  },
  { connection: redisConnection as any }
);

translateWorker.on('completed', (job) => console.log(`Translate Job ${job.id} completed!`));
translateWorker.on('failed', (job, err) => console.log(`Translate Job ${job?.id} failed: ${err.message}`));
