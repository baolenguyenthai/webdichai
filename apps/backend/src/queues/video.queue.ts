import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const videoQueue = new Queue('videoProcessing', {
  connection: redisConnection as any,
});

export const addVideoProcessingJob = async (projectId: string, videoUrl: string) => {
  await videoQueue.add('extractAudio', {
    projectId,
    videoUrl,
  });
};
