import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const exportQueue = new Queue('exportProcessing', {
  connection: redisConnection as any,
});

export interface ExportJobOptions {
  container?: 'mp4' | 'mov' | 'mkv';
  subtitleFormat?: 'srt' | 'ass' | 'vtt';
  audioMode?: 'original' | 'dub' | 'dual';
}

export const addExportJob = async (projectId: string, options: ExportJobOptions = {}) => {
  await exportQueue.add('exportVideo', {
    projectId,
    container: options.container || 'mp4',
    subtitleFormat: options.subtitleFormat || 'srt',
    audioMode: options.audioMode || 'dual',
  });
};
