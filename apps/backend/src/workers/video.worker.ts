import { Worker } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { redisConnection } from '../config/redis';
import { prisma } from '@ai-video-translator/database';
import fs from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import { AIService } from '../services/ai.service';
import { addTranslateJob } from '../queues/translate.queue';
import {
  downloadToTempFile,
  ensureTempDirs,
  normalizeImportUrl,
  resolveLocalMediaPath,
  tempDir,
  toPublicTempUrl,
} from '../utils/media';
import { emitPipelineProgress, estimateRemainingSeconds, PipelineStatus } from '../utils/pipeline';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ensureTempDirs();

const webVideoPattern = /youtube\.com|youtu\.be|douyin\.com|tiktok\.com|facebook\.com|vimeo\.com/i;

const getVideoDuration = (filePath: string) =>
  new Promise<number>((resolve) => {
    ffmpeg.ffprobe(filePath, (_error, metadata) => {
      resolve(Number(metadata?.format?.duration || 0));
    });
  });

const extractAudio = (
  inputPath: string,
  outputPath: string,
  onProgress: (percent: number) => void
) =>
  new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioFrequency(44100)
      .audioChannels(1)
      .on('progress', (progress) => onProgress(Math.floor(progress.percent || 0)))
      .on('end', () => {
        onProgress(100);
        resolve();
      })
      .on('error', reject)
      .save(outputPath);
  });

const resolveVideoSource = async (
  projectId: string,
  videoUrl: string,
  startedAt: number
) => {
  const localPath = resolveLocalMediaPath(videoUrl);
  if (localPath && fs.existsSync(localPath)) {
    emitPipelineProgress({
      projectId,
      stepIndex: 1,
      status: 'DOWNLOADING',
      stepPercent: 100,
      message: 'Video đã có sẵn trên máy chủ.',
      estimatedTimeLeft: estimateRemainingSeconds(startedAt, 1, 100),
    });
    return { processingPath: localPath, publicUrl: videoUrl };
  }

  let finalUrl = normalizeImportUrl(videoUrl);
  if (webVideoPattern.test(finalUrl)) {
    emitPipelineProgress({
      projectId,
      stepIndex: 1,
      status: 'DOWNLOADING',
      stepPercent: 15,
      message: 'Đang bóc tách link video gốc...',
      estimatedTimeLeft: estimateRemainingSeconds(startedAt, 1, 15),
    });

    const output: any = await youtubedl(finalUrl, {
      dumpJson: true,
      noWarnings: true,
      callHome: false,
      noCheckCertificates: true,
      preferFreeFormats: true,
    });

    if (!output?.url) throw new Error('Không tìm thấy stream video trong link này.');
    finalUrl = output.url;
  }

  const sourcePath = path.join(tempDir, `${projectId}_source.mp4`);
  await downloadToTempFile(finalUrl, sourcePath, (percent) => {
    emitPipelineProgress({
      projectId,
      stepIndex: 1,
      status: 'DOWNLOADING',
      stepPercent: Math.max(20, percent),
      message: `Đang tải video về máy chủ... ${percent}%`,
      estimatedTimeLeft: estimateRemainingSeconds(startedAt, 1, Math.max(20, percent)),
    });
  });

  const { publishVideoFile } = require('../utils/media');
  const publicUrl = await publishVideoFile(sourcePath, projectId);
  await prisma.project.update({
    where: { id: projectId },
    data: { videoUrl: publicUrl },
  });

  return { processingPath: sourcePath, publicUrl };
};

export const videoWorker = new Worker(
  'videoProcessing',
  async (job) => {
    const {
      projectId,
      videoUrl,
      targetLang = 'vi',
      translationStyle = 'natural',
      autoTranslate = true,
      autoExport = true,
      voiceId,
      voice = 'narrator',
      speed = 1,
      pitch = 1,
      volume = 1,
    } = job.data;

    const startedAt = Date.now();
    let currentStepIndex = 0;
    const audioPath = path.join(tempDir, `${projectId}.mp3`);

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
        data: { status: 'VIDEO_RECEIVED', targetLang },
      });
      updateProgress(0, 'VIDEO_RECEIVED', 100, 'Đã nhận video và tạo job xử lý.');

      currentStepIndex = 1;
      const { processingPath } = await resolveVideoSource(projectId, videoUrl, startedAt);

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'FFMPEG_EXTRACTING' },
      });

      updateProgress(2, 'FFMPEG_EXTRACTING', 5, 'Đang tách âm thanh bằng FFmpeg...');
      await extractAudio(processingPath, audioPath, (percent) => {
        updateProgress(2, 'FFMPEG_EXTRACTING', percent, `FFmpeg đang tách âm thanh... ${percent}%`);
      });

      const durationSeconds = await getVideoDuration(processingPath);
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'SPEECH_TO_TEXT' },
      });
      updateProgress(3, 'SPEECH_TO_TEXT', 10, 'Đang chuyển giọng nói thành văn bản...');

      const subtitles = await AIService.transcribeAudio(audioPath, durationSeconds);
      if (!subtitles.length) throw new Error('AI không tạo được phụ đề từ video này.');

      updateProgress(3, 'SPEECH_TO_TEXT', 100, `Đã tạo ${subtitles.length} dòng phụ đề.`);

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'DETECTING_LANGUAGE' },
      });
      updateProgress(4, 'DETECTING_LANGUAGE', 20, 'Đang nhận diện ngôn ngữ gốc...');
      const detectedLanguage = await AIService.detectLanguage(subtitles);

      await prisma.subtitle.deleteMany({ where: { projectId } });
      await prisma.subtitle.createMany({
        data: subtitles.map((subtitle) => ({
          projectId,
          text: subtitle.text,
          startTime: subtitle.startTime,
          endTime: subtitle.endTime,
        })),
      });

      await prisma.project.update({
        where: { id: projectId },
        data: {
          originalLang: detectedLanguage,
          status: autoTranslate ? 'TRANSLATING' : 'SUBTITLE_READY',
        },
      });

      updateProgress(4, 'DETECTING_LANGUAGE', 100, `Ngôn ngữ gốc: ${detectedLanguage.toUpperCase()}.`);

      if (autoTranslate) {
        await addTranslateJob(projectId, targetLang, {
          style: translationStyle,
          autoExport,
          voiceId,
          voice,
          speed,
          pitch,
          volume,
        });
        updateProgress(5, 'TRANSLATING', 5, 'Đã đưa vào hàng đợi dịch theo ngữ cảnh.');
      } else {
        updateProgress(7, 'SUBTITLE_READY', 100, 'Phụ đề đã sẵn sàng để chỉnh sửa hoặc xuất.');
      }

      return { projectId, subtitles: subtitles.length, detectedLanguage };
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
        message: error.message || 'Không thể xử lý video.',
      });

      throw error;
    } finally {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    }
  },
  { connection: redisConnection as any }
);

videoWorker.on('completed', (job) => {
  console.log(`Video job ${job.id} completed.`);
});

videoWorker.on('failed', (job, err) => {
  console.log(`Video job ${job?.id} failed with ${err.message}`);
});
