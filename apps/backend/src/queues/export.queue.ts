import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const exportQueue = new Queue('exportProcessing', {
  connection: redisConnection as any,
});

export const addExportJob = async (projectId: string) => {
  await exportQueue.add('exportVideo', {
    projectId,
  });
};
