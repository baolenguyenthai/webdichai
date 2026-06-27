import { prisma } from '@ai-video-translator/database';
import { buildSubtitleFile } from '../utils/subtitle-format';

export class SubtitleService {
  static async getSubtitles(projectId: string) {
    return prisma.subtitle.findMany({
      where: { projectId },
      orderBy: { startTime: 'asc' },
    });
  }

  static async updateSubtitle(
    id: string,
    data: { text?: string; translatedText?: string; startTime?: number; endTime?: number; audioUrl?: string }
  ) {
    return prisma.subtitle.update({
      where: { id },
      data,
    });
  }

  static async deleteSubtitle(id: string) {
    return prisma.subtitle.delete({
      where: { id },
    });
  }

  static async createSubtitle(projectId: string, data: { text: string, startTime: number, endTime: number }) {
    return prisma.subtitle.create({
      data: {
        projectId,
        ...data,
      },
    });
  }

  static async exportSubtitleFile(projectId: string, format: 'srt' | 'ass' | 'vtt') {
    const subtitles = await this.getSubtitles(projectId);
    return buildSubtitleFile(subtitles, format);
  }
}
