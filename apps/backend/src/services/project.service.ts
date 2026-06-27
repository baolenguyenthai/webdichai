import { prisma } from '@ai-video-translator/database';
import fs from 'fs';
import path from 'path';
import { tempDir } from '../utils/media';

const processingStatuses = [
  'PENDING',
  'VIDEO_RECEIVED',
  'DOWNLOADING',
  'ANALYZING_LINK',
  'EXTRACTING_AUDIO',
  'FFMPEG_EXTRACTING',
  'TRANSCRIBING',
  'SPEECH_TO_TEXT',
  'DETECTING_LANGUAGE',
  'TRANSLATING',
  'DUBBING',
  'VOICE_DUBBING',
  'SUBTITLE_READY',
  'EXPORTING',
];

const completedStatuses = ['COMPLETED', 'EXPORTED'];

const allowedProjectUpdates = new Set(['name', 'folderId', 'isFavorite', 'targetLang']);

const getDirectorySize = (dirPath: string): number => {
  if (!fs.existsSync(dirPath)) return 0;
  return fs.readdirSync(dirPath).reduce((total, file) => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    return total + (stat.isDirectory() ? getDirectorySize(filePath) : stat.size);
  }, 0);
};

export class ProjectService {
  static async createProject(userId: string, data: any) {
    return prisma.project.create({
      data: {
        userId,
        name: data.name,
        videoUrl: data.videoUrl,
        folderId: data.folderId,
        targetLang: data.targetLang,
      },
    });
  }

  static async listProjects(userId: string, filter?: any) {
    const where: any = { userId };
    
    if (filter?.isTrashed === true || filter?.isTrashed === 'true') {
      where.isTrashed = true;
    } else {
      where.isTrashed = false;
      if (filter?.isFavorite === true || filter?.isFavorite === 'true') where.isFavorite = true;
      if (filter?.folderId) where.folderId = filter.folderId;
    }

    if (filter?.search) {
      where.name = { contains: filter.search };
    }

    const sort = typeof filter?.sort === 'string' ? filter.sort : 'updatedAt:desc';
    const [sortField, sortDirection] = sort.split(':');
    const allowedSortFields = new Set(['name', 'createdAt', 'updatedAt', 'status']);

    return prisma.project.findMany({
      where,
      orderBy: {
        [allowedSortFields.has(sortField) ? sortField : 'updatedAt']: sortDirection === 'asc' ? 'asc' : 'desc',
      },
      include: { folder: true },
    });
  }

  static async getProject(userId: string, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.userId !== userId) throw new Error('Project not found');
    return project;
  }

  static async updateProject(userId: string, projectId: string, data: any) {
    const project = await this.getProject(userId, projectId);
    const safeData = Object.fromEntries(
      Object.entries(data).filter(([key]) => allowedProjectUpdates.has(key))
    );
    return prisma.project.update({
      where: { id: project.id },
      data: safeData,
    });
  }

  static async moveToTrash(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    return prisma.project.update({
      where: { id: project.id },
      data: { isTrashed: true, trashedAt: new Date() },
    });
  }

  static async restoreFromTrash(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    return prisma.project.update({
      where: { id: project.id },
      data: { isTrashed: false, trashedAt: null },
    });
  }

  static async deleteProjectPermanently(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    // TODO: Bổ sung logic xóa file trên Cloudinary ở đây
    return prisma.project.delete({
      where: { id: project.id },
    });
  }

  static async getDashboardStats(userId: string) {
    const [totalVideos, processingVideos, completedVideos, subtitles, latestProjects] = await Promise.all([
      prisma.project.count({ where: { userId, isTrashed: false } }),
      prisma.project.count({
        where: { userId, isTrashed: false, status: { in: processingStatuses } },
      }),
      prisma.project.count({
        where: { userId, isTrashed: false, status: { in: completedStatuses } },
      }),
      prisma.subtitle.findMany({
        where: { project: { userId, isTrashed: false } },
        select: { projectId: true, endTime: true },
      }),
      prisma.project.findMany({
        where: {
          userId,
          isTrashed: false,
          status: { in: ['EXPORTED', 'FAILED', 'SUBTITLE_READY'] },
        },
        select: { id: true, name: true, status: true, updatedAt: true, exportUrl: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const durationByProject = subtitles.reduce<Record<string, number>>((result, subtitle) => {
      result[subtitle.projectId] = Math.max(result[subtitle.projectId] || 0, subtitle.endTime);
      return result;
    }, {});
    const aiMinutesUsed = Math.ceil(
      Object.values(durationByProject).reduce((total, seconds) => total + seconds, 0) / 60
    );
    const storageUsedBytes = getDirectorySize(tempDir);

    return {
      totalVideos,
      processingVideos,
      completedVideos,
      storageUsedBytes,
      aiMinutesUsed,
      notifications: latestProjects.map((project) => ({
        id: project.id,
        title:
          project.status === 'FAILED'
            ? `Video "${project.name}" xử lý lỗi`
            : `Video "${project.name}" đã sẵn sàng`,
        status: project.status,
        createdAt: project.updatedAt,
        exportUrl: project.exportUrl,
      })),
    };
  }
}
