import { prisma } from '@ai-video-translator/database';

export class ProjectService {
  static async createProject(userId: string, data: any) {
    return prisma.project.create({
      data: {
        userId,
        name: data.name,
        videoUrl: data.videoUrl,
        folderId: data.folderId,
      },
    });
  }

  static async listProjects(userId: string, filter?: any) {
    const where: any = { userId };
    
    if (filter?.isTrashed) {
      where.isTrashed = true;
    } else {
      where.isTrashed = false;
      if (filter?.isFavorite) where.isFavorite = true;
      if (filter?.folderId) where.folderId = filter.folderId;
    }

    if (filter?.search) {
      where.name = { contains: filter.search };
    }

    return prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
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
    return prisma.project.update({
      where: { id: project.id },
      data,
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
}
