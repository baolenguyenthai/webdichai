import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { getIO } from '../config/socket';
import { prisma } from '@ai-video-translator/database';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';

const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Helper tạo định dạng thời gian cho SRT
const formatSrtTime = (seconds: number) => {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, '0');
  return `${hh}:${mm}:${ss},${ms}`;
};

export const exportWorker = new Worker(
  'exportProcessing',
  async (job) => {
    const { projectId } = job.data;
    console.log(`Bắt đầu Export Video cho Project ${projectId}...`);
    
    const io = getIO();
    const notify = (status: string, percent: number, exportUrl?: string) => {
      io.to(`project_${projectId}`).emit('processProgress', { projectId, status, percent, exportUrl });
    };

    let originalVideoPath = '';
    let srtPath = '';
    let outputPath = '';

    try {
      await prisma.project.update({ where: { id: projectId }, data: { status: 'EXPORTING' } });
      notify('EXPORTING', 10);

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || !project.videoUrl) throw new Error('Project/Video not found');

      // 1. Tải Video gốc về temp folder
      originalVideoPath = path.join(tempDir, `${projectId}_original.mp4`);
      const response = await axios({ url: project.videoUrl, method: 'GET', responseType: 'stream' });
      const writer = fs.createWriteStream(originalVideoPath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(true));
        writer.on('error', reject);
      });
      notify('EXPORTING', 30);

      // 2. Tạo file SRT từ Subtitles
      const subtitles = await prisma.subtitle.findMany({ where: { projectId }, orderBy: { startTime: 'asc' } });
      let srtContent = '';
      subtitles.forEach((sub, i) => {
        const text = sub.translatedText || sub.text;
        srtContent += `${i + 1}\n${formatSrtTime(sub.startTime)} --> ${formatSrtTime(sub.endTime)}\n${text}\n\n`;
      });
      srtPath = path.join(tempDir, `${projectId}.srt`);
      fs.writeFileSync(srtPath, srtContent);
      notify('EXPORTING', 50);

      // 3. Dùng FFmpeg để burn hard-sub vào Video
      outputPath = path.join(tempDir, `${projectId}_final.mp4`);
      
      // Chú ý: Filter subtitles trong FFmpeg yêu cầu escape đường dẫn (nhất là trên Windows)
      // Để tránh lỗi, ta sẽ cd vào thư mục temp trước hoặc escape tốt nhất có thể
      const srtPathFfmpeg = srtPath.replace(/\\/g, '/');

      await new Promise((resolve, reject) => {
        ffmpeg(originalVideoPath)
          .videoFilters(`subtitles=${srtPathFfmpeg}`)
          .outputOptions('-c:a copy') // Giữ nguyên audio
          .on('progress', (progress) => {
            if (progress.percent) {
              const currentPercent = Math.min(50 + Math.floor(progress.percent / 2), 95);
              notify('EXPORTING', currentPercent);
            }
          })
          .on('end', () => resolve(true))
          .on('error', reject)
          .save(outputPath);
      });
      
      notify('EXPORTING', 95);

      // 4. (Giả lập) Upload Video Final lên S3/Cloudinary
      // Ở đây ta ghi nhận link local của output path hoặc public URL nếu có server static. 
      // Do là demo, ta tạm dùng /temp (Cần map express static vào /temp)
      const exportUrl = `/temp/${projectId}_final.mp4`;

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'EXPORTED', exportUrl },
      });

      notify('EXPORTED', 100, exportUrl);
      console.log(`Hoàn tất Export Video cho Project ${projectId}`);

    } catch (error) {
      console.error('Lỗi Export Worker:', error);
      await prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED' } });
      notify('FAILED', 0);
      throw error;
    } finally {
      // Dọn dẹp file trung gian
      if (fs.existsSync(originalVideoPath)) fs.unlinkSync(originalVideoPath);
      if (fs.existsSync(srtPath)) fs.unlinkSync(srtPath);
      // Không xóa outputPath vì user cần tải
    }
  },
  { connection: redisConnection as any }
);
