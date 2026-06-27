import { getIO } from '../config/socket';

export type PipelineStepStatus = 'pending' | 'processing' | 'done' | 'error';

export const PIPELINE_STEPS = [
  'Video',
  'Download',
  'FFmpeg',
  'Speech to Text',
  'Detect Language',
  'Translate',
  'Voice Dub',
  'Subtitle',
  'Export',
] as const;

export type PipelineStatus =
  | 'PENDING'
  | 'VIDEO_RECEIVED'
  | 'DOWNLOADING'
  | 'FFMPEG_EXTRACTING'
  | 'SPEECH_TO_TEXT'
  | 'DETECTING_LANGUAGE'
  | 'TRANSLATING'
  | 'VOICE_DUBBING'
  | 'SUBTITLE_READY'
  | 'EXPORTING'
  | 'EXPORTED'
  | 'FAILED';

interface EmitPipelineProgressOptions {
  projectId: string;
  stepIndex: number;
  status: PipelineStatus;
  stepPercent: number;
  message: string;
  estimatedTimeLeft?: number;
  exportUrl?: string;
}

export const getOverallPercent = (stepIndex: number, stepPercent: number) => {
  const safeStep = Math.max(0, Math.min(stepIndex, PIPELINE_STEPS.length - 1));
  const safePercent = Math.max(0, Math.min(stepPercent, 100));
  return Math.min(100, Math.floor(((safeStep + safePercent / 100) / PIPELINE_STEPS.length) * 100));
};

export const buildPipelineSteps = (
  currentStepIndex: number,
  failed = false
): Array<{ name: string; status: PipelineStepStatus }> => {
  return PIPELINE_STEPS.map((name, index) => {
    if (failed && index === currentStepIndex) return { name, status: 'error' };
    if (index < currentStepIndex) return { name, status: 'done' };
    if (index === currentStepIndex) return { name, status: 'processing' };
    return { name, status: 'pending' };
  });
};

export const emitPipelineProgress = ({
  projectId,
  stepIndex,
  status,
  stepPercent,
  message,
  estimatedTimeLeft = 0,
  exportUrl,
}: EmitPipelineProgressOptions) => {
  try {
    const io = getIO();
    io.to(`project_${projectId}`).emit('processProgress', {
      projectId,
      status,
      percent: getOverallPercent(stepIndex, stepPercent),
      stepPercent,
      currentStepIndex: stepIndex,
      totalSteps: PIPELINE_STEPS.length,
      message,
      estimatedTimeLeft,
      exportUrl,
      steps: buildPipelineSteps(stepIndex, status === 'FAILED'),
    });
  } catch (error) {
    // Workers can also run in scripts/tests before Socket.IO is initialized.
  }
};

export const estimateRemainingSeconds = (
  startedAt: number,
  stepIndex: number,
  stepPercent: number
) => {
  const overallPercent = getOverallPercent(stepIndex, stepPercent);
  if (overallPercent <= 0) return 0;

  const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
  const totalEstimate = elapsedSeconds / (overallPercent / 100);
  return Math.max(1, Math.ceil(totalEstimate - elapsedSeconds));
};
