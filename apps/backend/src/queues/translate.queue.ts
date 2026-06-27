import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const translateQueue = new Queue('translateProcessing', {
  connection: redisConnection as any,
});

export const addTranslateJob = async (projectId: string, targetLang: string) => {
  await translateQueue.add('translateAndDub', {
    projectId,
    targetLang,
  });
};
