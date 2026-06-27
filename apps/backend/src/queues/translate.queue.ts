import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const translateQueue = new Queue('translateProcessing', {
  connection: redisConnection as any,
});

export interface TranslateJobOptions {
  style?: string;
  autoExport?: boolean;
  voiceId?: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export const addTranslateJob = async (
  projectId: string,
  targetLang: string,
  options: TranslateJobOptions = {}
) => {
  await translateQueue.add('translateAndDub', {
    projectId,
    targetLang,
    style: options.style || 'natural',
    autoExport: options.autoExport === true,
    voiceId: options.voiceId,
    voice: options.voice || 'narrator',
    speed: options.speed || 1,
    pitch: options.pitch || 1,
    volume: options.volume || 1,
  });
};
