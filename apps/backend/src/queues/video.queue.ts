import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const videoQueue = new Queue('videoProcessing', {
  connection: redisConnection as any,
});

export interface VideoProcessingJobOptions {
  targetLang?: string;
  translationStyle?: string;
  autoTranslate?: boolean;
  autoExport?: boolean;
  voiceId?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export const addVideoProcessingJob = async (
  projectId: string,
  videoUrl: string,
  options: VideoProcessingJobOptions = {}
) => {
  await videoQueue.add('extractAudio', {
    projectId,
    videoUrl,
    targetLang: options.targetLang || 'vi',
    translationStyle: options.translationStyle || 'natural',
    autoTranslate: options.autoTranslate !== false,
    autoExport: options.autoExport !== false,
    voiceId: options.voiceId,
    voice: options.voice || 'narrator',
    speed: options.speed || 1,
    pitch: options.pitch || 1,
    volume: options.volume || 1,
  });
};
