import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '@ai-video-translator/database';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import {
  downloadToTempFile,
  ensureTempDirs,
  fromPublicTempUrl,
  isRemoteUrl,
  publishVideoFile,
  resolveLocalMediaPath,
  tempDir,
} from '../utils/media';
import { buildSubtitleFile } from '../utils/subtitle-format';
import { emitPipelineProgress, estimateRemainingSeconds } from '../utils/pipeline';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ensureTempDirs();

type AudioMode = 'original' | 'dub' | 'dual';
type Container = 'mp4' | 'mov' | 'mkv';
type SubtitleFormat = 'srt' | 'ass' | 'vtt';

const escapeSubtitlePath = (filePath: string) => filePath.replace(/\\/g, '/').replace(/'/g, "\\'");

const prepareVideoSource = async (
  projectId: string,
  videoUrl: string,
  startedAt: number,
  onDownloadedPath: (filePath: string) => void
) => {
  const localPath = resolveLocalMediaPath(videoUrl);
  if (localPath && fs.existsSync(localPath)) return localPath;

  if (!isRemoteUrl(videoUrl)) throw new Error('Video URL is not available');

  const downloadPath = path.join(tempDir, `${projectId}_export_source.mp4`);
  onDownloadedPath(downloadPath);
  await downloadToTempFile(videoUrl, downloadPath, (percent) => {
    emitPipelineProgress({
      projectId,
      stepIndex: 8,
      status: 'EXPORTING',
      stepPercent: Math.min(20, Math.floor(percent / 5)),
      message: `Đang chuẩn bị video gốc... ${percent}%`,
      estimatedTimeLeft: estimateRemainingSeconds(startedAt, 8, Math.min(20, Math.floor(percent / 5))),
    });
  });
  return downloadPath;
};

const createDubTrack = async (
  projectId: string,
  subtitles: Array<{ startTime: number; audioUrl?: string | null }>,
  volume: number
) => {
  const audioSegments = subtitles
    .map((subtitle) => {
      if (!subtitle.audioUrl) return null;
      const audioPath = subtitle.audioUrl.startsWith('/temp/')
        ? fromPublicTempUrl(subtitle.audioUrl)
        : resolveLocalMediaPath(subtitle.audioUrl);
      if (!audioPath || !fs.existsSync(audioPath)) return null;
      return {
        path: audioPath,
        delayMs: Math.max(0, Math.floor(subtitle.startTime * 1000)),
      };
    })
    .filter(Boolean) as Array<{ path: string; delayMs: number }>;

  if (audioSegments.length === 0) return null;

  const dubPath = path.join(tempDir, `${projectId}_dub.mp3`);

  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg();
    audioSegments.forEach((segment) => command.input(segment.path));

    const safeVolume = Math.max(0, Math.min(Number(volume || 1), 2));
    const filters =
      audioSegments.length === 1
        ? [`[0:a]adelay=${audioSegments[0].delayMs}|${audioSegments[0].delayMs},apad,volume=${safeVolume}[dub]`]
        : [
            ...audioSegments.map(
              (segment, index) =>
                `[${index}:a]adelay=${segment.delayMs}|${segment.delayMs},apad,volume=${safeVolume}[d${index}]`
            ),
            `${audioSegments.map((_segment, index) => `[d${index}]`).join('')}amix=inputs=${audioSegments.length}:normalize=0:duration=longest[dub]`,
          ];

    command
      .complexFilter(filters)
      .outputOptions(['-map [dub]', '-c:a libmp3lame', '-q:a 4'])
      .on('end', () => resolve())
      .on('error', reject)
      .save(dubPath);
  });

  return dubPath;
};

const renderVideo = async ({
  inputPath,
  subtitlePath,
  outputPath,
  dubPath,
  audioMode,
  container,
  projectId,
  startedAt,
}: {
  inputPath: string;
  subtitlePath: string;
  outputPath: string;
  dubPath: string | null;
  audioMode: AudioMode;
  container: Container;
  projectId: string;
  startedAt: number;
}) => {
  await new Promise<void>((resolve, reject) => {
    const command = ffmpeg(inputPath);
    if (dubPath && audioMode !== 'original') command.input(dubPath);

    const outputOptions = ['-c:v libx264', '-preset veryfast', '-pix_fmt yuv420p'];
    if (container === 'mp4' || container === 'mov') outputOptions.push('-movflags +faststart');

    if (dubPath && audioMode === 'dub') {
      outputOptions.push('-map 0:v:0', '-map 1:a:0', '-c:a aac', '-shortest');
    } else if (dubPath && audioMode === 'dual') {
      outputOptions.push(
        '-map 0:v:0',
        '-map 0:a?',
        '-map 1:a:0',
        '-c:a aac',
        '-metadata:s:a:0 title=Original',
        '-metadata:s:a:1 title=AI Dub'
      );
    } else {
      outputOptions.push('-c:a copy');
    }

    command
      .videoFilters(`subtitles='${escapeSubtitlePath(subtitlePath)}'`)
      .outputOptions(outputOptions)
      .on('progress', (progress) => {
        const percent = Math.min(95, Math.max(35, Math.floor(progress.percent || 35)));
        emitPipelineProgress({
          projectId,
          stepIndex: 8,
          status: 'EXPORTING',
          stepPercent: percent,
          message: `Đang render video... ${percent}%`,
          estimatedTimeLeft: estimateRemainingSeconds(startedAt, 8, percent),
        });
      })
      .on('end', () => resolve())
      .on('error', reject)
      .save(outputPath);
  });
};

export const exportWorker = new Worker(
  'exportProcessing',
  async (job) => {
    const {
      projectId,
      container = 'mp4',
      subtitleFormat = 'srt',
      audioMode = 'dual',
      volume = 1,
    }: {
      projectId: string;
      container?: Container;
      subtitleFormat?: SubtitleFormat;
      audioMode?: AudioMode;
      volume?: number;
    } = job.data;

    const startedAt = Date.now();
    let downloadedSourcePath = '';
    const finalContainer: Container = ['mp4', 'mov', 'mkv'].includes(container) ? container : 'mp4';
    const finalSubtitleFormat: SubtitleFormat = ['srt', 'ass', 'vtt'].includes(subtitleFormat)
      ? subtitleFormat
      : 'srt';
    const finalAudioMode: AudioMode = ['original', 'dub', 'dual'].includes(audioMode) ? audioMode : 'dual';

    const subtitlePath = path.join(tempDir, `${projectId}.${finalSubtitleFormat}`);
    const burnSubtitlePath = path.join(tempDir, `${projectId}_burn.srt`);
    const outputPath = path.join(tempDir, `${projectId}_final.${finalContainer}`);

    try {
      await prisma.project.update({ where: { id: projectId }, data: { status: 'EXPORTING' } });
      emitPipelineProgress({
        projectId,
        stepIndex: 8,
        status: 'EXPORTING',
        stepPercent: 5,
        message: 'Đang chuẩn bị dữ liệu export...',
        estimatedTimeLeft: estimateRemainingSeconds(startedAt, 8, 5),
      });

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project?.videoUrl) throw new Error('Project/Video not found');

      const inputPath = await prepareVideoSource(projectId, project.videoUrl, startedAt, (filePath) => {
        downloadedSourcePath = filePath;
      });

      const subtitles = await prisma.subtitle.findMany({ where: { projectId }, orderBy: { startTime: 'asc' } });
      if (subtitles.length === 0) throw new Error('No subtitles found');

      fs.writeFileSync(subtitlePath, buildSubtitleFile(subtitles, finalSubtitleFormat));
      fs.writeFileSync(burnSubtitlePath, buildSubtitleFile(subtitles, 'srt'));

      emitPipelineProgress({
        projectId,
        stepIndex: 8,
        status: 'EXPORTING',
        stepPercent: 25,
        message: `Đã tạo phụ đề ${finalSubtitleFormat.toUpperCase()}, đang chuẩn bị audio...`,
        estimatedTimeLeft: estimateRemainingSeconds(startedAt, 8, 25),
      });

      const dubPath = await createDubTrack(projectId, subtitles, volume);
      emitPipelineProgress({
        projectId,
        stepIndex: 8,
        status: 'EXPORTING',
        stepPercent: 35,
        message: dubPath ? 'Đã tạo track AI dub, bắt đầu render...' : 'Không có track dub, render với audio gốc...',
        estimatedTimeLeft: estimateRemainingSeconds(startedAt, 8, 35),
      });

      await renderVideo({
        inputPath,
        subtitlePath: burnSubtitlePath,
        outputPath,
        dubPath,
        audioMode: finalAudioMode,
        container: finalContainer,
        projectId,
        startedAt,
      });

      const exportUrl = await publishVideoFile(outputPath, projectId);
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'EXPORTED', exportUrl },
      });

      emitPipelineProgress({
        projectId,
        stepIndex: 8,
        status: 'EXPORTED',
        stepPercent: 100,
        message: 'Render hoàn tất. Video đã sẵn sàng để tải xuống.',
        estimatedTimeLeft: 0,
        exportUrl,
      });

      return { projectId, exportUrl };
    } catch (error: any) {
      await prisma.project.update({ where: { id: projectId }, data: { status: 'FAILED' } });
      emitPipelineProgress({
        projectId,
        stepIndex: 8,
        status: 'FAILED',
        stepPercent: 0,
        message: error.message || 'Không thể export video.',
      });
      throw error;
    } finally {
      if (downloadedSourcePath && fs.existsSync(downloadedSourcePath)) fs.unlinkSync(downloadedSourcePath);
      if (fs.existsSync(burnSubtitlePath)) fs.unlinkSync(burnSubtitlePath);
    }
  },
  { connection: redisConnection as any }
);

exportWorker.on('completed', (job) => console.log(`Export job ${job.id} completed.`));
exportWorker.on('failed', (job, err) => console.log(`Export job ${job?.id} failed: ${err.message}`));
