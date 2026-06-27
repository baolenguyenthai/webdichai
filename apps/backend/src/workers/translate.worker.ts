import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '@ai-video-translator/database';
import { TranslateService } from '../services/translate.service';
import fs from 'fs';
import path from 'path';
import { ensureTempDirs, tempDir } from '../utils/media';
import { addExportJob } from '../queues/export.queue';
import { emitPipelineProgress, estimateRemainingSeconds, PipelineStatus } from '../utils/pipeline';

ensureTempDirs();

export const translateWorker = new Worker(
  'translateProcessing',
  async (job) => {
    const {
      projectId,
      targetLang = 'vi',
      style = 'natural',
      autoExport = false,
      voiceId,
      voice = 'narrator',
      speed = 1,
      pitch = 1,
      volume = 1,
    } = job.data;

    const startedAt = Date.now();
    let currentStepIndex = 5;

    const updateProgress = (
      stepIndex: number,
      status: PipelineStatus,
      stepPercent: number,
      message: string
    ) => {
      currentStepIndex = stepIndex;
      emitPipelineProgress({
        projectId,
        stepIndex,
        status,
        stepPercent,
        message,
        estimatedTimeLeft: estimateRemainingSeconds(startedAt, stepIndex, stepPercent),
      });
    };

    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'TRANSLATING', targetLang },
      });
      updateProgress(5, 'TRANSLATING', 10, `Đang dịch phụ đề sang ${targetLang.toUpperCase()}...`);

      const subtitles = await prisma.subtitle.findMany({
        where: { projectId },
        orderBy: { startTime: 'asc' },
      });

      if (subtitles.length === 0) throw new Error('No subtitles found');

      const translatedSubtitles = await TranslateService.translateSubtitles(subtitles, targetLang, style);
      for (let index = 0; index < translatedSubtitles.length; index += 1) {
        const subtitle = translatedSubtitles[index];
        await prisma.subtitle.update({
          where: { id: subtitle.id },
          data: { translatedText: subtitle.translatedText },
        });
        updateProgress(
          5,
          'TRANSLATING',
          10 + Math.floor(((index + 1) / translatedSubtitles.length) * 90),
          `Đang dịch phụ đề... ${index + 1}/${translatedSubtitles.length}`
        );
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'VOICE_DUBBING' },
      });
      updateProgress(6, 'VOICE_DUBBING', 5, `Đang tạo giọng ${voice} cho bản dịch...`);

      for (let index = 0; index < translatedSubtitles.length; index += 1) {
        const subtitle = translatedSubtitles[index];
        const text = subtitle.translatedText || subtitle.text;
        const durationSeconds = Math.max(0.3, Number(subtitle.endTime) - Number(subtitle.startTime));
        const audioBuffer = await TranslateService.generateSpeech(text, voiceId, {
          durationSeconds,
          speed,
          volume,
        });

        if (audioBuffer.length > 0) {
          const audioName = `${projectId}_sub_${subtitle.id}.mp3`;
          const audioPath = path.join(tempDir, audioName);
          fs.writeFileSync(audioPath, audioBuffer);

          await prisma.subtitle.update({
            where: { id: subtitle.id },
            data: { audioUrl: `/temp/${audioName}` },
          });
        }

        updateProgress(
          6,
          'VOICE_DUBBING',
          Math.floor(((index + 1) / translatedSubtitles.length) * 100),
          `Đang tạo voice dub... ${index + 1}/${translatedSubtitles.length}`
        );
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { status: autoExport ? 'EXPORTING' : 'SUBTITLE_READY' },
      });
      updateProgress(7, 'SUBTITLE_READY', 100, 'Phụ đề và voice dub đã sẵn sàng.');

      if (autoExport) {
        await addExportJob(projectId, { audioMode: 'dual', subtitleFormat: 'srt', container: 'mp4' });
        updateProgress(8, 'EXPORTING', 5, 'Đã đưa vào hàng đợi render video.');
      }

      return { projectId, subtitles: translatedSubtitles.length, targetLang, pitch };
    } catch (error: any) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });
      emitPipelineProgress({
        projectId,
        stepIndex: currentStepIndex,
        status: 'FAILED',
        stepPercent: 0,
        message: error.message || 'Không thể dịch/lồng tiếng video.',
      });
      throw error;
    }
  },
  { connection: redisConnection as any }
);

translateWorker.on('completed', (job) => console.log(`Translate job ${job.id} completed.`));
translateWorker.on('failed', (job, err) => console.log(`Translate job ${job?.id} failed: ${err.message}`));
