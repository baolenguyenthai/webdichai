import { Worker } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { redisConnection } from '../config/redis';
import { getIO } from '../config/socket';
import { prisma } from '@ai-video-translator/database';
import fs from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

export const videoWorker = new Worker(
  'videoProcessing',
  async (job) => {
    const { projectId, videoUrl } = job.data;
    const outputPath = path.join(tempDir, `${projectId}.mp3`);

    console.log(`Bắt đầu xử lý Project ${projectId}...`);

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'ANALYZING_LINK' },
    });

    try {
      const io = getIO();
      io.to(`project_${projectId}`).emit('processProgress', {
        projectId,
        status: 'ANALYZING_LINK',
        percent: 0,
      });
    } catch (e) {}

    let finalVideoUrl = videoUrl;

    // Nếu link không kết thúc bằng file media chuẩn, ta sẽ dùng yt-dlp để lấy link thực tế
    const needsYtdl = /youtube\.com|youtu\.be|douyin\.com|tiktok\.com|facebook\.com|vimeo\.com/i.test(videoUrl);
    
    if (needsYtdl) {
      console.log(`Phát hiện web link: ${videoUrl}. Đang bóc tách direct link...`);
      try {
        const output: any = await youtubedl(videoUrl, {
          dumpJson: true,
          noWarnings: true,
          callHome: false,
          noCheckCertificates: true,
          preferFreeFormats: true,
        });
        if (output && output.url) {
          finalVideoUrl = output.url;
          console.log(`Lấy thành công direct link!`);
        } else {
          throw new Error("Không tìm thấy stream video trong link này.");
        }
      } catch (err: any) {
        console.error(`Lỗi bóc tách link ${videoUrl}:`, err);
        throw err;
      }
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'EXTRACTING_AUDIO' },
    });

    return new Promise((resolve, reject) => {
      ffmpeg(finalVideoUrl)
        .noVideo()
        .audioCodec('libmp3lame')
        .on('progress', (progress) => {
          const percent = Math.floor(progress.percent || 0);
          console.log(`Processing ${projectId}: ${percent}%`);
          
          try {
            const io = getIO();
            io.to(`project_${projectId}`).emit('processProgress', {
              projectId,
              status: 'EXTRACTING_AUDIO',
              percent,
            });
          } catch (e) {
             // Socket.io có thể chưa khởi tạo trong môi trường test
          }
        })
        .on('end', async () => {
          // Gọi AI Service để transcribe
          try {
            console.log(`Bắt đầu Transcribe bằng AI cho ${projectId}...`);
            const AIService = require('../services/ai.service').AIService;
            const subtitles = await AIService.transcribeAudio(outputPath);
            
            // Lưu vào DB
            await prisma.subtitle.createMany({
              data: subtitles.map((sub: any) => ({
                projectId,
                text: sub.text,
                startTime: sub.startTime,
                endTime: sub.endTime,
              }))
            });

            console.log(`Xử lý AI xong cho ${projectId}, đã lưu ${subtitles.length} dòng phụ đề`);

            await prisma.project.update({
              where: { id: projectId },
              data: { status: 'TRANSCRIBED' },
            });

            try {
              const io = getIO();
              io.to(`project_${projectId}`).emit('processProgress', {
                projectId,
                status: 'TRANSCRIBED',
                percent: 100,
              });
            } catch (e) {}

          } catch (aiError) {
            console.error('Lỗi AI:', aiError);
            await prisma.project.update({
              where: { id: projectId },
              data: { status: 'FAILED' },
            });
          } finally {
            // Xóa file local sau khi xử lý xong
            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }
          }

          resolve(outputPath);
        })
        .on('error', async (err) => {
          console.error(`Lỗi xử lý ${projectId}:`, err);
          
          await prisma.project.update({
            where: { id: projectId },
            data: { status: 'FAILED' },
          });

          reject(err);
        })
        .save(outputPath);
    });
  },
  { connection: redisConnection as any }
);

videoWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

videoWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with ${err.message}`);
});
